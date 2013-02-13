class ParserController < ApplicationController
  require 'anystyle/parser'
  require 'citeproc'
  require 'openurl'
  require 'typhoeus'
  
  protect_from_forgery :except => :create

  def index
    respond_to do |format|
      @citation = params[:q] || ""
      @sources  = params[:sources] || {}
      @style    = (params[:style] && valid_styles.include?(params[:style])) ? params[:style] : "apa"

      @sources.each do |key, source|
        if !valid_sources.include?(key)
          @sources.delete(key)
        end
      end

      response = (@citation =~ doi_regex) ? doi_response : parse_response
      
      format.json do
        render :json => { :metadata => make_metadata, :records => [response] }, :callback => params[:callback]
      end
      
      format.xml do
        render :xml => response
      end
      
      format.html do
      end

    end
  end

  def create
    @sources = params[:sources] || {}
    @sources.each do |key, source|
      @sources.delete(key) if !valid_sources.include?(key)
    end
    
    @style = (params[:style] && valid_styles.include?(params[:style])) ? params[:style] : "apa"
    @records = multiparse_response

    respond_to do |format|
      format.json do
        render :json => { :metadata => make_metadata, :records => @records }, :callback => params[:callback]
      end

      format.xml do
        render :xml => @records
      end

      format.html do
      end
    end

  end

  protected

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
      parsed["verbatim"] = @citation
      save_parsed(parsed) unless parsed["status"] == "failed"
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
      parsed["formatted"] = format_citeproc(parsed) unless parsed["status"] == "failed"
      parsed["identifiers"] = make_requests(parsed).flatten unless parsed["status"] == "failed"
      parsed["verbatim"] = citation
      records << parsed
      save_parsed(parsed) unless parsed["status"] == "failed"
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

  def parse(citation = nil)
    @parser.parse(citation || @citation, :citeproc)[0]
  end
  
  def tagged
    @parser.parse(@citation, :tags)[0]
  end
  
  def save_parsed(parsed)
    record = Citation.find_by_citeproc_id(parsed["id"])
    if record.nil?
      doi = nil
      parsed["identifiers"].each do |identifier|
        if identifier[:type] == "doi"
          doi = identifier[:id]
        end
      end
      record = Citation.new({
        :citeproc_id => parsed["id"],
        :citation => parsed["verbatim"],
        :doi => doi
      })
      record.save!
    end
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

  def doi_lookup
    doi = @citation.match(doi_regex)[0].chomp('.')
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
      :id => @citation.match(doi_regex)[0].chomp('.'),
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
