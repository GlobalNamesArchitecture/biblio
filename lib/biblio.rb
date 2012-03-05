require 'anystyle/parser'

module Biblio
  module Parser
    def rebuild_default_model
      Anystyle.parser.train Biblio::Application.config.anystyle[:training_data], true
      Anystyle.parser.model.save
    end
    
    def add_to_model
      Tag.all.each do |tag|
        Anystyle.parser.train tag.markup, false
      end
      Anystyle.parser.model.save
    end
  end
end