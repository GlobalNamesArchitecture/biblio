//= require jquery.contextMenu
//= require jquery.grabtag
$ ->
 config = {
   config_ele : '#grabtag-initializer',
   multitag : false,
   tags : {
       "journal" : [
         { "author"  : { 'background-color' : '#8dd3c7' }},
         { "date"    : { 'background-color' : '#ffa1ff' }},
         { "title"   : { 'background-color' : '#ffffb3' }},
         { "journal" : { 'background-color' : '#79fc72' }},
         { "volume"  : { 'background-color' : '#72f3fc' }},
         { "pages"   : { 'background-color' : '#7284fc', 'color' : '#fff' }},
         { "doi"     : { 'background-color' : '#ffabab' }} ],
       "book" : [
         { "author"      : { 'background-color' : '#8dd3c7' }},
         { "date"        : { 'background-color' : '#ffa1ff' }},
         { "title"       : { 'background-color' : '#ffffb3' }},
         { "booktitle"   : { 'background-color' : '#d19a41', 'color' : '#fff' }},
         { "pages"       : { 'background-color' : '#7284fc', 'color' : '#fff' }},
         { "edition"     : { 'background-color' : '#fb8072' }},
         { "editor"      : { 'background-color' : '#948669', 'color' : '#fff' }},
         { "publisher"   : { 'background-color' : '#fdb562' }},
         { "institution" : { 'background-color' : '#000', 'color' : '#fff' }},
         { "location"    : { 'background-color' : '#bfbada' }},
         { "isbn"        : { 'background-color' : '#80b1d3' }},
         { "doi"         : { 'background-color' : '#ffabab' }} ],
       "extra" : [ "note", "container", "retrieved", "tech", "translator", "unknown", "url" ]
   },
   active_group : 'journal',
   onMultitagWarning : (obj, tag) ->
     alert($(tag).attr("data-grabtag") + " has already been used")
   onActivate : (obj, data) ->
     $('#grabtag-output').val(data.content)
     $('[data-grabtag="volume"]', '#grabtag-initializer').parent().hide();
   onTag : (obj, tag, data) ->
     $(tag).parent().hide()
     $('#grabtag-output').val(data.content)
     console.log(data)
   onTagResize : (obj, data) ->
     $('#grabtag-output').val(data.content)
     console.log(data)
   onTagRemove : (obj, data) ->
     $('#grabtag-output').val(data.content)
     $('#grabtag-initializer').find('[data-grabtag=' + data.tag.type + ']').parent().show()
     console.log(data)
 }
 $(".biblio-selector").grabtag(config)

 $(".clear-button").bind 'click', (event) =>
   $(".biblio-selector").grabtag("remove_all")
   $("#grabtag-initializer").find(".grabtag-selector").parent().show()

  config = {
    tags        : ["taxon", "color", "shape"],
    sticky      : true,
    sticky_tag  : 'color',
    config_ele  : '#freeform-config'
    onTag       : (obj, tag, data) ->
      offset = 'offset:start=' + data.tag.offset.start + ' , offset:end=' + data.tag.offset.end
      $("#freeform-output").val(data.tag.type + ': ' + data.tag.value + ' (added, ' + offset + ')')
    onTagResize : (obj, data) ->
      offset = 'offset:start=' + data.tag.offset.start + ' , offset:end=' + data.tag.offset.end
      $("#freeform-output").val(data.tag.type + ': ' + data.tag.value + ' (resized, ' + offset + ')')
    onTagRemove : (obj, data) ->
      offset = 'offset:start=' + data.tag.offset.start + ' , offset:end=' + data.tag.offset.end
      $("#freeform-output").val(data.tag.type + ': ' + data.tag.value + ' (removed, ' + offset + ')')
  }
  $(".freeform").grabtag(config)