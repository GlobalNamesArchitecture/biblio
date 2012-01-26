/**
 * jQuery Grab Tag
 *
 * A tool to highlight and tag parts of text
 * 
 * Version 0.1
 * January 22, 2012
 *
 * Copyright (c) 2012 David P. Shorthouse
 * Licensed under the MIT license.
 * http://creativecommons.org/licenses/MIT/
 **/
/*global $, jQuery, window, document, alert */

(function($, gt){

  "use strict";

  $.unique = function(arr) {
    if (!!arr[0].nodeType) {
      return _old.apply(this,arguments);
    } else {
      return $.grep(arr,function(v,k) {
        return $.inArray(v,arr) === k;
      });
    }
  };

  var eventName = "mouseup." + gt,
      selectors = {
       "journal" : [ "author", "date", "title", "journal", "volume", "pages", "doi" ],
       "book"    : [ "author", "date", "title", "booktitle", "pages", "edition", "editor", "publisher", "institution", "location", "isbn", "doi" ],
       "extra"   : [ "note", "container", "retrieved", "tech", "translator", "unknown", "url" ]
      },
      all_selectors = $.unique(selectors.journal.concat(selectors.book).concat(selectors.extra)),

  get_style = function(obj) {
    return JSON.stringify(obj).replace(/[{}"]/g, "").replace(",", ";");
  },

  convert_markup = function(obj) {
    var snippet = "",
        result = obj.clone();

//TODO: ignore html tags yet retain biblio tags

    $.each(all_selectors, function() {
      snippet = $('[data=' + this + ']', result);
      snippet.wrap('<' + this + '>' + snippet.text() + '</' + this + '>').remove();
    });
    $('#' + gt + '-output').val(result.html());
  },

  clear_selected = function() {
    var sel;

    if(document.selection && document.selection.empty){
      document.selection.empty() ;
    } else if(window.getSelection) {
      sel = window.getSelection();
      if(sel && sel.removeAllRanges) { sel.removeAllRanges(); }
    }
  },

  remove_tag = function(id) {
    $('#' + id).remove();
  },

  get_selected = function(e) {
    var sel     = "",
        range   = 0,
        newNode = {},
        childNode = {};

    if(window.getSelection) {
      sel = window.getSelection();
    } else if (document.getSelection) {
      sel = document.getSelection();
    } else if(document.selection) {
      sel = document.selection.createRange();
    }

    if($('#' + gt + "-" + e.data.item).length === 1) {
      clear_selected();
      alert(e.data.settings.selector_warning);
      return;
    }

//TODO: add resizers for selectors akin to that in jCrop

    if($.trim(sel) !== "") {

      newNode = document.createElement("div");
      newNode.setAttribute('id', gt + '-' + e.data.item);
      newNode.setAttribute('class', gt + '-selector ' + gt + '-tag');
      newNode.setAttribute('style', get_style(e.data.settings.tags[e.data.item] || e.data.settings.base_styles[e.data.item]));
      newNode.setAttribute('title', e.data.item);
      newNode.setAttribute('data', e.data.item);

      childNode = document.createElement("div");
      childNode.setAttribute('class', gt + '-resizer left');
      newNode.appendChild(childNode);

      childNode = document.createElement("div");
      childNode.setAttribute('class', gt + '-resizer right');
      newNode.appendChild(childNode);

      if(sel.getRangeAt) {
        try {
          range = sel.getRangeAt(0);
          range.surroundContents(newNode);
        } catch(err) {
          remove_tag(gt + "-" + e.data.item);
          clear_selected();
          alert(e.data.settings.selector_warning);
          return;
        }
      } else {
        newNode.innerText = sel.text;
        sel.pasteHTML($('#' + gt + "-" + e.data.item).html());
      }

      convert_markup($(this));
    }

    clear_selected();
  },

  build_selector = function(title, settings) {
    return '<div class="' + gt + '-selector" style="' + get_style(settings.tags[title] || settings.base_styles[title]) + '">' + title + '</div>';
  },

  build_initializer = function(obj, settings) {
    var content, button, selector;

    content  = '<div class="' + gt + '-selectors">' + settings.config_text + '</div>';
    content += '<div class="' + gt + '-selectors-buttons"></div>';

    $.each(selectors, function(index, value) {
      value = null;
      content += '<div class="' + gt + '-selectors-type ' + index + '"></div>';
    });

    $(settings.config_element).append(content);

    $.each(selectors, function(index, value) {
      button = '<button class="' + gt + '-selectors-button ' + index + '">' + index + '</button>';
      $('.' + gt + '-selectors-buttons').append(button);
      $.each(value, function() {
        selector = build_selector(this, settings);
        $('.' + gt + '-selectors-type.' + index).append(selector);
        if(this === settings.initial_selector) { $('.' + gt + '-selector:contains('+this+')').addClass('selected'); }
      });
    });

    $(settings.config_element).find('.' + gt + '-selectors-button').each(function() {
      $(this).bind('click', function(e) {
        e.preventDefault();
        $(this).addClass("selected").siblings().removeClass("selected");
        $('.' + gt + '-selectors-type', settings.config_element).hide();
        $.each($(this).attr("class").split(/\s+/), function() {
          $('.' + gt + '-selectors-type.' + this, settings.config_element).show();
        });
      });
      if($(this).hasClass(settings.initial_type)) { $(this).trigger('click'); }
    }).end().find('.' + gt + '-selector').each(function() {
      $(this).click(function(e) {
        var self = $(this);
        e.preventDefault();
        self.siblings().removeClass("selected").end().addClass("selected").parent().siblings().children().removeClass("selected");
        $(obj)[gt]("destroy")[gt]({"config_activate" : false, "initial_selector" : self.text(), "tags" : settings.styles });
      });
    });
  },

  methods = {
    init : function(f, options) {
      f = null;
      return this.each(function() {
        var self = $(this), settings = $.extend({}, $.fn[gt].defaults, options);

//TODO: have one initializer work for multiple citations, tagged in one textarea

        if(settings.config_activate) { build_initializer(self, settings); }
        self.bind(eventName, { 'item' : settings.initial_selector, settings : settings }, get_selected);
      });
    },
    remove : function() {
      return this.each(function() {
        $(this).html($(this).text());
      });
    },
    destroy : function() {
      return this.unbind(eventName);
    }
  };

  $.fn[gt] = function(method) {
    if (methods[method]) {
      return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
    } else if (typeof method === "function" || !method) {
      return methods.init.apply(this, arguments);
    } else if (typeof method === "object") {
      return methods.init.apply(this, [null, method]);
    } else {
      $.error( 'Method ' +  method + ' does not exist on jQuery ' + gt );
    }
  };

  $.fn[gt].defaults = {
    'initial_type'     : 'journal',
    'initial_selector' : 'author',
    'tags' : {},
    'base_styles'  : {
      'author'      : { 'background-color' : '#8dd3c7' },
      'booktitle'   : { 'background-color' : '#ffa1ff' },
      'container'   : { 'background-color' : '#c8c8c8' },
      'date'        : { 'background-color' : '#ffffb3' },
      'doi'         : { 'background-color' : '#79fc72' },
      'edition'     : { 'background-color' : '#72f3fc' },
      'editor'      : { 'background-color' : '#7284fc', 'color' : 'white' },
      'institution' : { 'background-color' : '#ffabab' },
      'isbn'        : { 'background-color' : '#d19a41', 'color' : 'white' },
      'journal'     : { 'background-color' : '#fb8072' },
      'location'    : { 'background-color' : '#948669', 'color' : 'white' },
      'note'        : { 'background-color' : '#c8c8c8' },
      'pages'       : { 'background-color' : '#fdb562' },
      'publisher'   : { 'background-color' : '#000', 'color' : 'white' },
      'retrieved'   : { 'background-color' : '#c8c8c8' },
      'tech'        : { 'background-color' : '#c8c8c8' },
      'title'       : { 'background-color' : '#bfbada' },
      'translator'  : { 'background-color' : '#c8c8c8' },
      'unknown'     : { 'background-color' : '#c8c8c8' },
      'url'         : { 'background-color' : '#c8c8c8' },
      'volume'      : { 'background-color' : '#80b1d3' }
    },
    'selector_warning' : 'Either you already used that tag or your selection is overlapping with a previously created tag. Please try again.',
    'config_element'   : '#' + gt + '-initializer',
    'config_text'      : '',
    'config_activate'  : true //feels like a hack

//TODO: create user-supplied callback

  };

}(jQuery, 'grabtag'));