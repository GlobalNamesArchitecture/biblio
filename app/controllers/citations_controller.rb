class CitationsController < ApplicationController
  require 'anystyle/parser'
  require 'openurl'
  require 'typhoeus'

  def index
    citation = params[:q] rescue nil
    callback = params[:callback] rescue nil
    sources = params[:sources] rescue nil
    if citation =~ /10.(\d)+(\S)+/
      parsed = doi_lookup(citation)
    else
      parsed = parse(citation)
      parsed["identifiers"] = make_requests(parsed).flatten unless parsed["type"].nil?
    end
    render :json => { :metadata => make_metadata, :records => [parsed] }, :callback => callback
  end

  def create
    @records = []
    citations = params[:citations].split("\r\n").delete_if { |r| r == "" }
    citations.each do |citation|
      parsed = parse(citation)
      parsed["status"] = (parsed["author"].nil? || parsed["title"].nil?) ? "failed" : "success"
      parsed["verbatim"] = citation
      parsed["identifiers"] = make_requests(parsed).flatten unless parsed["status"] == "failed"
      @records << parsed
    end

    respond_to do |format|
      callback = params[:callback] rescue nil
      format.json do
        render :json => { :metadata => make_metadata, :records => @records }, :callback => callback
      end
      
      format.html do
      end
    end
    
  end
  
  protected

  def doi_lookup(doi)
    req = Typhoeus::Request.new('http://dx.doi.org/' << doi, :timeout => 10000, :headers => { "Accept" => "application/citeproc+json" }, :follow_location => true, :cache_timeout => 1.day)
    req.on_complete do |r|
      result = []
      if r.success?
        result = JSON.parse(r.body)
        result["identifiers"] = [{ "id" => doi, "type" => "doi"}]
        result
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
  
  def parse(citation)
    Anystyle.parse(citation, :citeproc)[0]
  end

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
    return metadata
  end
  
  def make_requests(parsed)
    hydra = setup_hydra
    co = context_object(parsed)
    requests = []
    allowed = [:crossref,:bhl,:biostor]
    params[:sources].each do |key, source|
      if allowed.include? key.to_sym
        requests << send(key, co)
      end
    end unless params[:sources].nil?
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
#    hydra.cache_getter do |request|
#      Rails.cache.read(request.cache_key) rescue nil
#    end
#    hydra.cache_setter do |request|
#      Rails.cache.write(request.cache_key,request.response,expires_in: request.cache_timeout)
#    end
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
  
  def crossref(co)
    #TODO: ignore books?
    transport = OpenURL::Transport.new('http://www.crossref.org/openurl', co)
    transport.extra_args = { :pid => 'dshorthouse@eol.org', :noredirect => true }
    req = Typhoeus::Request.new('http://www.crossref.org' << transport.get_path, :timeout => 10000, :cache_timeout => 1.day)
    req.on_complete do |r|
      result = []
      if r.success?
        response = Hash.from_xml(r.body)["crossref_result"]["query_result"]["body"]["query"] rescue nil
        doi = response["doi"] rescue nil
        result << { :id => doi, :type => "doi", :raw_metadata => response } unless doi.nil?
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
    req = Typhoeus::Request.new('http://www.biodiversitylibrary.org' << transport.get_path, :timeout => 10000, :cache_timeout => 1.day)
    req.on_complete do |r|
      result = []
      if r.success?
        #TODO: refine multiple results returned from BHL
        JSON.parse(r.body)["citations"].each do |c|
          result << { :id => c["TitleUrl"], :type => "bhl", :raw_metadata => c } unless c["TitleUrl"].nil?
        end rescue nil
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
    req = Typhoeus::Request.new('http://biostor.org' << transport.get_path, :timeout => 10000, :cache_timeout => 1.day)
    req.on_complete do |r|
      result = []
      if r.success?
        #TODO: check if multiple results returned from BioStor
        response = JSON.parse(r.body) rescue nil
        result << { :id => "http://biostor.org/reference/" << response["reference_id"], :type => "biostor", :raw_metadata => response } unless response["reference_id"].nil?
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
