class TrainController < ApplicationController
  protect_from_forgery :except => :create
  
  def create
    tagged = params[:tagged]
    begin
      Anystyle.parser.train tagged, false
      Anystyle.parser.model.save
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

end