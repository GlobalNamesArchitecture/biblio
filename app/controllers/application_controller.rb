class ApplicationController < ActionController::Base
  protect_from_forgery

  def valid_sources
    ["crossref", "bhl", "biostor"]
  end
  
  def valid_styles
    ["ama", "apa", "asa"]
  end
  
  def doi_regex
    Regexp.new('10\.(\d)+([^(\s\>\"\<)])+')
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

  def setup_parser
    @parser = Anystyle::Parser::Parser.new ({
      :model => Biblio::Application.config.anystyle[:model],
      :training_data => Biblio::Application.config.anystyle[:training_data],
      :mode => Biblio::Application.config.anystyle[:mode],
      :host => Biblio::Application.config.anystyle[:host]
    })
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

end
