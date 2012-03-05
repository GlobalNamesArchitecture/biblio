require 'anystyle/parser'

module Biblio
  module Parser
    def rebuild_training_set
      Anystyle.parser.train Biblio::Application.config.anystyle[:training_data], true
      Anystyle.parser.model.save
    end
  end
end