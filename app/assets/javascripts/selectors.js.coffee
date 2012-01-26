//= require jquery.grabtag
$ ->
 $(".biblio-selector").grabtag()

 $(".clear-button").bind 'click', (event) =>
   $(".biblio-selector").grabtag("remove")

  