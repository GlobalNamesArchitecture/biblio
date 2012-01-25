//= require jquery.refselector
$ ->
 $(".biblio-selector").refselector()

 $(".clear-button").bind 'click', (event) =>
   $(".biblio-selector").refselector("remove")

  