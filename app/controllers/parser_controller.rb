class ParserController < ApplicationController
  require 'anystyle/parser'
  require 'citeproc'
  require 'openurl'
  require 'typhoeus'

  def index
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

    response = (@citation =~ /10.(\d)+(\S)+/) ? doi_response : parse_response

    render :json => { :metadata => make_metadata, :records => [response] }, :callback => params[:callback]
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
      parsed = doi_lookup
      parsed["identifiers"] = [{ "id" => parsed["DOI"], "type" => "doi" }]
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
      parsed = parse
      parsed["identifiers"] = make_requests(parsed).flatten
      parsed["formatted"] = format_citeproc(parsed)
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
    return "failed" if parsed["author"].nil? || parsed["issued"]["date-parts"].nil? || parsed["title"].nil?
    "success"
  end

  def format_citeproc(cp)
    CiteProc.process(cp, :style => @style)
  end

  def parse(citation = nil)
    Anystyle.parse(citation || @citation, :citeproc)[0]
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

    if parsed["type"] == 'journal' || parsed["type"] == 'article'
      co.referent.set_format("journal")
      co.referent.set_metadata('atitle', parsed["title"]) unless parsed["title"].nil?
      co.referent.set_metadata('jtitle', parsed["container-title"]) unless parsed["container-title"].nil?
      co.referent.set_metadata('volume', parsed["volume"]) unless parsed["volume"].nil?
    elsif parsed["type"] == 'book'
      co.referent.set_metadata('btitle', parsed["container-title"]) unless parsed["container-title"].nil?
      co.referent.set_metadata('publisher', parsed["publisher"]) unless parsed["publisher"].nil?
    end
    co.referent.set_metadata('aulast', parsed["author"][0]["family"]) unless parsed["author"].nil?
    co.referent.set_metadata('aufirst', parsed["author"][0]["given"]) unless parsed["author"].nil?
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
      result = []
      if r.success?
        result = JSON.parse(r.body)
      elsif r.timed_out?
        #TODO: do something here
        result
      else
        #TODO: do something here
        result
      end
    end
    hydra = setup_hydra
    hydra.queue req
    hydra.run
    req.handled_response
  end

  def crossref(co)
    #TODO: ignore books?
    transport = OpenURL::Transport.new('http://www.crossref.org/openurl', co)
    transport.extra_args = { :pid => 'dshorthouse@eol.org', :noredirect => true }
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
