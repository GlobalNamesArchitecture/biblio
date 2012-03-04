class ParserController < ApplicationController
  require 'anystyle/parser'
  require 'citeproc'
  require 'openurl'
  require 'typhoeus'
  
  protect_from_forgery :except => :create

  def index
    respond_to do |format|
      format.json do
        valid_sources = ["crossref", "bhl", "biostor"]
        valid_styles  = ["ama", "apa", "asa"]

        @citation = params[:q] || ""
        @sources  = params[:sources] || {}
        @style    = (params[:style] && valid_styles.include?(params[:style])) ? params[:style] : "apa"

        @sources.each do |key, source|
          if !valid_sources.include?(key)
            @sources.delete(key)
          end
        end

        response = (@citation =~ /10\.(\d)+([^(\s\>\"\<)])+/) ? doi_response : parse_response

        render :json => { :metadata => make_metadata, :records => [response] }, :callback => params[:callback]
      end

      format.html do
      end

    end
  end

  def create
    valid_sources = ["crossref", "bhl", "biostor"]

    @sources = params[:sources] || {}

    @sources.each do |key, source|
      if !valid_sources.include?(key)
        @sources.delete(key)
      end
    end

    @records = multiparse_response

    respond_to do |format|
      format.json do
        render :json => { :metadata => make_metadata, :records => @records }, :callback => params[:callback]
      end

      format.html do
      end
    end

  end

  protected

  def make_metadata
    metadata = {
      :format => "citeproc",
      :id => "refparser",
      :owner => "David P. Shorthouse",
      :specification => "0.81",
      :namespaces => {
        :bibo => "http://purl.org/ontology/bibo/"
      }
    }
  end

  def doi_response
    begin
      hydra = setup_hydra
      @doi_lookup = doi_lookup
      @issn_lookup = issn_lookup
      hydra.queue @doi_lookup
      hydra.queue @issn_lookup
      hydra.run

      parsed = @doi_lookup.handled_response
      issn = @issn_lookup.handled_response

      parsed["identifiers"] = [{ "id" => parsed["DOI"], "type" => "doi" }]
      issn.each do |i|
        parsed["identifiers"] << i
      end

      parsed["formatted"] = format_citeproc(parsed)
      parsed["type"] = (parsed["type"] == "article-journal") ? "article" : parsed["type"]
      parsed["status"] = "success"
    rescue
      parsed = {}
      parsed["status"] = "failed"
    end
    parsed
  end

  def parse_response
    begin
      setup_parser
      parsed = parse
      parsed["identifiers"] = make_requests(parsed).flatten
      parsed["formatted"] = format_citeproc(parsed)
      parsed["tagged"] = tagged
      parsed["status"] = get_status(parsed)
    rescue
      parsed = {}
      parsed["status"] = "failed"
    end
    parsed
  end

  def multiparse_response
    records = []
    citations = params[:citations].split("\r\n").delete_if { |r| r == "" }
    setup_parser
    citations.each do |citation|
      parsed = parse(citation)
      parsed["status"] = get_status(parsed)
      parsed["identifiers"] = make_requests(parsed).flatten unless parsed["status"] == "failed"
      parsed["verbatim"] = citation
      records << parsed
    end
    records
  end

  def get_status(parsed)
    return "failed" if parsed["author"].nil? || parsed["issued"]["date-parts"].nil? || parsed["title"].nil? || parsed["type"].nil? || parsed["container-title"].nil?
    "success"
  end

  def format_citeproc(cp)
    CiteProc.process(cp, :style => @style) rescue nil
  end
  
  def setup_parser
    @parser = Anystyle::Parser::Parser.new ({
      :model => Biblio::Application.config.anystyle[:model],
      :training_data => Biblio::Application.config.anystyle[:training_data],
      :mode => Biblio::Application.config.anystyle[:mode],
      :host => Biblio::Application.config.anystyle[:host]
    })
  end

  def parse(citation = nil)
    @parser.parse(citation || @citation, :citeproc)[0]
  end
  
  def tagged
    @parser.parse(@citation, :tags)[0]
  end

  def make_requests(parsed)
    hydra = setup_hydra
    co = context_object(parsed)
    requests = []
    @sources.each do |key, source|
      requests << send(key, co)
    end
    requests.each do |r|
      hydra.queue r
    end
    hydra.run
    responses = []
    requests.each do |r|
      responses << r.handled_response
    end
    return responses
  end

  def setup_hydra
    hydra = Typhoeus::Hydra.new
    hydra.cache_getter do |request|
      Rails.cache.read(request.cache_key) rescue nil
    end
    hydra.cache_setter do |request|
      Rails.cache.write(request.cache_key,request.response,expires_in: request.cache_timeout)
    end
    return hydra
  end

  def context_object(parsed)
    co = OpenURL::ContextObject.new
    co.referent.set_format(parsed["type"])
    co.referent.set_metadata('genre', parsed["type"])
    co.refererent.set_metadata('id', parsed["DOI"]) unless parsed["DOI"].nil?

    if parsed["type"] == 'journal' || parsed["type"] == 'article' || parsed["type"] == 'article-journal'
      co.referent.set_format("journal")
      co.referent.set_metadata('atitle', parsed["title"]) unless parsed["title"].nil?
      co.referent.set_metadata('jtitle', parsed["container-title"]) unless parsed["container-title"].nil?
      co.referent.set_metadata('volume', parsed["volume"]) unless parsed["volume"].nil?
    elsif parsed["type"] == 'book'
      co.referent.set_metadata('btitle', parsed["container-title"]) unless parsed["container-title"].nil?
      co.referent.set_metadata('publisher', parsed["publisher"]) unless parsed["publisher"].nil?
    end
    co.referent.set_metadata('aulast', parsed["author"][0]["family"]) unless parsed["author"].nil? && parsed["author"][0]["family"].nil?
    co.referent.set_metadata('aufirst', parsed["author"][0]["given"]) unless parsed["author"].nil? && parsed["author"][0]["given"].nil?
    co.referent.set_metadata('date', parsed["year"]) unless parsed["year"].nil?
    co.referent.set_metadata('pages', parsed["page"]) unless parsed["page"].nil?
    pages = parsed["page"].split("--") unless parsed["page"].nil?
    co.referent.set_metadata('spage', pages[0]) unless pages.nil?

    return co
  end

  def doi_lookup
    doi = @citation.match(/10.(\d)+(\S)+/)[0].chomp('.')
    req = Typhoeus::Request.new('http://dx.doi.org/' << doi, :timeout => 8000, :headers => { "Accept" => "application/citeproc+json" }, :follow_location => true, :cache_timeout => 1.day)
    req.on_complete do |r|
      if r.success?
        begin
          JSON.parse(r.body)
        rescue
          nil
        end
      elsif r.timed_out?
        #TODO: do something here
        nil
      else
        #TODO: do something here
        nil
      end
    end
    return req
  end
  
  def issn_lookup
    params = {
      :id => @citation.match(/10.(\d)+(\S)+/)[0].chomp('.'),
      :noredirect => true,
      :pid => Biblio::Application.config.crossref_pid
    }.to_query
    req = Typhoeus::Request.new('http://www.crossref.org/openurl?' << params, :timeout => 8000, :cache_timeout => 1.day)  
    req.on_complete do |r|
      if r.success?
        begin
          issn_types = { :electronic => "eISSN", :print => "ISSN" }
          Nokogiri::XML(r.body).css('issn').map {|x| { "id" => x.content, "type" => issn_types[x.attributes["type"].value.to_sym] } }
        rescue
          nil
        end
      elsif r.timed_out?
        #TODO: do something here
        nil
      else
        #TODO: do something here
        nil
      end
    end
    return req
  end

  def crossref(co)
    #TODO: ignore books?
    transport = OpenURL::Transport.new('http://www.crossref.org/openurl', co)
    transport.extra_args = { :pid => Biblio::Application.config.crossref_pid, :noredirect => true }
    req = Typhoeus::Request.new('http://www.crossref.org' << transport.get_path, :timeout => 8000, :cache_timeout => 1.day)
    req.on_complete do |r|
      result = []
      if r.success?
        begin
          response = Hash.from_xml(r.body)["crossref_result"]["query_result"]["body"]["query"]
          doi = response["doi"]
          result << { :id => doi, :type => "doi", :raw_metadata => response } if doi
        rescue
          nil
        end
        result
      elsif r.timed_out?
        #TODO: do something here
        result
      else
        #TODO: do something here
        result
      end
    end
    return req
  end

  def bhl(co)
    transport = OpenURL::Transport.new('http://www.biodiversitylibrary.org/openurl', co)
    transport.extra_args = { :format => 'json' }
    req = Typhoeus::Request.new('http://www.biodiversitylibrary.org' << transport.get_path, :timeout => 8000, :cache_timeout => 1.day)
    req.on_complete do |r|
      result = []
      if r.success?
        #TODO: refine multiple results returned from BHL
        begin
          JSON.parse(r.body)["citations"].each do |c|
            id = c["TitleUrl"]
            result << { :id => id, :type => "bhl", :raw_metadata => c } if id
          end
        rescue
          nil
        end
        result
      elsif r.timed_out?
        #TODO: do something here
        result
      else
        #TODO: do something here
        result
      end
    end
    return req
  end

  def biostor(co)
    transport = OpenURL::Transport.new('http://biostor.org/openurl', co)
    transport.extra_args = { :format => 'json' }
    req = Typhoeus::Request.new('http://biostor.org' << transport.get_path, :timeout => 8000, :cache_timeout => 1.day)
    req.on_complete do |r|
      result = []
      if r.success?
        #TODO: check if multiple results returned from BioStor
        begin
          response = JSON.parse(r.body)
          id = response["reference_id"]
          result << { :id => "http://biostor.org/reference/" << id, :type => "biostor", :raw_metadata => response } if id
        rescue
          nil
        end
        result
      elsif r.timed_out?
        #TODO: do something here
        result
      else
        #TODO: do something here
        result
      end
    end
    return req
  end

end
