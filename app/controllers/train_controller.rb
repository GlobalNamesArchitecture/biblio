class TrainController < ApplicationController
  require 'anystyle/parser'
  
  protect_from_forgery :except => :create
  
  def create
    tagged = params[:tagged]
    begin
      parser = Anystyle::Parser::Parser.new ({
        :model => Biblio::Application.config.anystyle[:model],
        :training_data => Biblio::Application.config.anystyle[:training_data],
        :mode => Biblio::Application.config.anystyle[:mode],
        :host => Biblio::Application.config.anystyle[:host]
      })
      parser.train normalize(tagged), false
      parser.model.save
      tag = Tag.new(:markup => tagged)
      tag.save!
      response = "success"
    rescue
      response = "failed"
    end

    respond_to do |format|
      format.json do
        render :json => { :status => response }
      end
    end
  end
  
  protected
  
  def normalize(tag)
  end

end