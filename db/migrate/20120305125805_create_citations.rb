class CreateCitations < ActiveRecord::Migration
  def change
    create_table :citations do |t|
      t.string :citeproc_id, :null => false
      t.text :citation, :null => false
      t.string :doi
      t.timestamps
    end
    add_index :citations, :citeproc_id, :unique => true
  end
end
