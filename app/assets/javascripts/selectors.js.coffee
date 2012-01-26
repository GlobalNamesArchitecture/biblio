//= require jquery.grabtag
$ ->
 config = {
   onTagged : (obj, data) -> console.log(data)
 }
 $(".biblio-selector").grabtag(config)

 $(".clear-button").bind 'click', (event) =>
   $(".biblio-selector").grabtag("remove")

  