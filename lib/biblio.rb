require 'anystyle/parser'

module Biblio
  module Parser
    def rebuild_default_model
      Anystyle.parser.train Biblio::Application.config.anystyle[:training_data], true
      Anystyle.parser.model.save
    end
    
    def append_train_file
      File.open(Biblio::Application.config.anystyle[:training_data], 'a') do |f|
        Tag.all.each do |tag|
          f.write "\n" << tag.markup
        end
      end
    end
  end
end