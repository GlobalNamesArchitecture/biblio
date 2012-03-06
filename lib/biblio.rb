require 'anystyle/parser'
require 'nokogiri'
require 'crxmake'

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
  
  module Chrome
    def build_chrome_extension(version, fqd = 'http://biblio.globalnames.org/')
      @version = version
      @fqd = fqd
      construct_crx
      construct_updates
    end
    
    private
    
    def construct_updates
      builder = Nokogiri::XML::Builder.new(:encoding => 'UTF-8') do |xml|
        xml.gupdate(:xmlns => 'http://www.google.com/update2/response', :protocol => '2.0') do
          xml.app(:appid => Biblio::Application.config.chrome_app_id) do
            xml.updatecheck(:codebase => @fqd + ['bibliospotter','bibliospotter.crx'].join("/"), :version => @version)
          end
        end
      end
      xml_data = builder.to_xml
      updates_file = open(File.join(Rails.root, "public", "bibliospotter", 'updates.xml'), 'w:utf-8')
      updates_file.write(xml_data)
      updates_file.close
    end
    
    def construct_crx
      CrxMake.make(
        :ex_dir => Rails.root.join("app", "bibliospotter", "src").to_s,
        :pkey   => Rails.root.join("app", "bibliospotter","bibliospotter.pem").to_s,
        :crx_output => Rails.root.join("public", "bibliospotter","bibliospotter.crx").to_s,
        :verbose => true
      )
    end
  end
end