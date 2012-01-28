//= require jquery.grabtag
$ ->
 config = {
   multitag : false,
   onActivate : (obj, data) -> 
     $('#grabtag-output').val(data)
   onTagged : (obj, data) -> 
     $('#grabtag-output').val(data)
 }
 $(".biblio-selector").grabtag(config)

 $(".clear-button").bind 'click', (event) =>
   $(".biblio-selector").grabtag("remove")

  