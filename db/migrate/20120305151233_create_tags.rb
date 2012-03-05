class CreateTags < ActiveRecord::Migration
  def change
    create_table :tags do |t|
      t.text :markup
      t.timestamps
    end
  end
end
