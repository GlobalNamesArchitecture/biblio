class CitationsController < ApplicationController
  require 'anystyle/parser'
  require 'openurl'
  require 'typhoeus'

  def index
    citation = params[:q] rescue nil
    callback = params[:callback] rescue nil
    sources = params[:sources] rescue nil
    parsed = parse(citation) unless citation.nil?
    parsed["identifiers"] = make_requests(parsed) unless parsed.nil?
    render :json => { :metadata => make_metadata, :records => [parsed] }, :callback => callback
  end

  def create
    @records = []

    citations = params[:citations].split("\r\n").delete_if { |r| r == "" }
    citations.each do |citation|
      parsed = parse(citation)
      parsed["status"] = (parsed["author"].nil? || parsed["title"].nil?) ? "failed" : "success"
      parsed["verbatim"] = citation
      parsed["identifiers"] = make_requests(parsed) unless parsed["status"] == "failed"
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

  def parse(citation)
    Anystyle.parse(citation, :citeproc)[0]
  end
  
  def make_metadata
    return { :format => "citeproc" }
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
      hydra.queue r[:req]
    end
    hydra.run
    responses = []
    requests.each do |r|
      id = (r[:req].handled_response.is_a? String) ? r[:req].handled_response : nil
      responses << { "id" => id, "type" => r["type"] } unless id.nil?
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
    req = Typhoeus::Request.new('http://www.crossref.org' << transport.get_path, :timeout => 3000, :cache_timeout => 1.day)
    req.on_complete do |r|
      if r.success?
        Nokogiri::XML(r.body).css("doi")[0].children.to_s rescue nil
      elsif r.timed_out?
        #TODO: do something here
      else
        #TODO: do something here
      end
    end
    return { "type" => "doi", :req => req }
  end
  
  def bhl(co)
    #TODO: ignore journal articles?
    transport = OpenURL::Transport.new('http://www.biodiversitylibrary.org/openurl', co)
    transport.extra_args = { :format => 'xml' }
    req = Typhoeus::Request.new('http://www.biodiversitylibrary.org' << transport.get_path, :timeout => 5000, :cache_timeout => 1.day)
    req.on_complete do |r|
      if r.success?
        #TODO: check if multiple results returned from BHL
        Nokogiri::XML(r.body.gsub! "utf-16", "utf-8").css("ItemUrl")[0].children.to_s rescue nil
      elsif r.timed_out?
        #TODO: do something here
      else
        #TODO: do something here
      end
    end
    return { "type" => "bhl", :req => req }
  end
  
  def biostor(co)
    transport = OpenURL::Transport.new('http://biostor.org/openurl', co)
    transport.extra_args = { :format => 'json' }
    req = Typhoeus::Request.new('http://biostor.org' << transport.get_path, :timeout => 5000, :cache_timeout => 1.day)
    req.on_complete do |r|
      if r.success?
        "http://biostor.org/reference/" << JSON.parse(r.body)["reference_id"] rescue nil
      elsif r.timed_out?
      else
      end
    end
    return { "type" => "biostor", :req => req }
  end

end
