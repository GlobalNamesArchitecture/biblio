class ApplicationController < ActionController::Base
  require 'anystyle/parser'
  protect_from_forgery
  
  Anystyle::Parser.instance.options[:model] = Biblio::Application.config.anystyle[:model]
  Anystyle::Parser::Dictionary.instance.options[:mode] = Biblio::Application.config.anystyle[:mode]
  Anystyle::Parser::Dictionary.instance.options[:host] = Biblio::Application.config.anystyle[:host]
end
