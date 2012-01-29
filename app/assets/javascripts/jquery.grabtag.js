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
      settings = {},
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
        result  = $(obj).clone();

    $.each(all_selectors, function() {
      var tag = this;
      snippet = $('[data-' + gt + '=' + tag + ']', result);
      snippet.each(function() {
        $(this).wrap('<' + tag + '>' + $(this).text() + '</' + tag + '>').remove();
      });
    });
    return result.html();
  },

  preloader = function(obj, settings) {
    $.each(all_selectors, function() {
      var tag = this, snippet, style;
      snippet = $('[data-' + gt + '=' + tag + ']', obj);
      style = get_style(settings.tags[tag] || settings.base_styles[tag]);
      if(snippet.length > 1 && !settings.multitag) {
        $(snippet[0]).addClass(gt + '-selector ' + gt + '-tag').attr('title', tag).attr('style', style);
        add_resizers(obj, $(snippet[0]));
      } else {
        snippet.each(function() {
          $(this).addClass(gt + '-selector ' + gt + '-tag').attr('title', tag).attr('style', style);
          add_resizers(obj, $(this));
        });
      }
    });
    settings.onActivate.call(this, obj, convert_markup(obj));
  },

  clear_selections = function() {
    var sel;

    if(document.selection && document.selection.empty){
      document.selection.empty() ;
    } else if(window.getSelection) {
      sel = window.getSelection();
    } else if(document.getSelection) {
      sel = document.getSelection();
    }
    if(sel && sel.removeAllRanges) { sel.removeAllRanges(); }
  },

  build_resizer = function(type) {
    return '<span class="' + gt + '-resizer ' + gt + '-resizer-' + type + '"></span>';
  },

  get_selections = function() {
    var sel;

    if(window.getSelection) {
      sel = window.getSelection();
    } else if (document.getSelection) {
      sel = document.getSelection();
    } else if(document.selection) {
      sel = document.selection.createRange();
    }
    return sel;
  },

  add_resizers = function(obj, newNode) {
    var resizer_w = build_resizer('w'),
        resizer_e = build_resizer('e'),
        sel, selector = $(newNode).attr("data-" + gt), new_range;

    $(newNode).prepend(resizer_w).append(resizer_e);

//WIP: building resizer capability here
/*
    $('.' + gt + '-resizer-e', $(newNode)).hover(
      function() {
        clear_selections();
        $(newNode).attr("data-" + gt, "");
        new_range = document.createRange();
        sel = window.getSelection();
        sel.removeAllRanges();
        new_range.setStart(obj, 0);
        new_range.setEnd(obj.childNodes[2], 10);
        sel.addRange(new_range);
        var content = $(newNode).text();
        $(newNode).before(content).remove();
      },
      function() {
        $(newNode).attr("data-" + gt, selector);
      }
    );
*/
  },

  tag_selected = function(e) {
    var sel, range, newNode;

    sel = get_selections();

    if(!e.data.settings.multitag && $('.' + gt + '-tag[data-' + gt + '=' + e.data.item + ']', $(this)).length === 1) {
      clear_selections();
      e.data.settings.onMultitagWarning.call();
      return;
    }

    if($.trim(sel) !== "") {

      e.data.settings.beforeTagged.call(this, $(this));

      newNode = document.createElement("span");
      newNode.setAttribute('class', gt + '-selector ' + gt + '-tag');
      newNode.setAttribute('style', get_style(e.data.settings.tags[e.data.item] || e.data.settings.base_styles[e.data.item]));
      newNode.setAttribute('title', e.data.item);
      newNode.setAttribute('data-' + gt, e.data.item);

      if(sel.getRangeAt) {
        try {
          range = sel.getRangeAt(0);
          range.surroundContents(newNode);
          add_resizers(this, newNode);
        } catch(err) {
          clear_selections();
          e.data.settings.onOverlapWarning.call();
          return;
        }
      } else { //IE < 9
        alert("Sory, Internet Explorer < 9 is not supported.");
      }

      e.data.settings.onTagged.call(this, $(this), convert_markup(this));
    }

    clear_selections();
  },

  build_selector = function(title, settings) {
    return '<span class="' + gt + '-selector" style="' + get_style(settings.tags[title] || settings.base_styles[title]) + '">' + title + '</span>';
  },

  build_initializer = function(obj, settings) {
    var content, button, selector;

    content  = '<div class="' + gt + '-selectors-buttons"></div>';

    $.each(selectors, function(index, value) {
      value = null;
      content += '<div class="' + gt + '-selectors-type ' + index + '"></div>';
    });

    $(settings.config_ele).append(content);

    $.each(selectors, function(index, value) {
      button = '<button class="' + gt + '-selectors-button ' + index + '">' + index + '</button>';
      $('.' + gt + '-selectors-buttons').append(button);
      $.each(value, function() {
        selector = build_selector(this, settings);
        $('.' + gt + '-selectors-type.' + index).append(selector);
      });
    });

    $(settings.config_ele).find('.' + gt + '-selectors-button').each(function() {
      $(this).bind('click', function(e) {
        e.preventDefault();
        $(this).addClass("selected").siblings().removeClass("selected");
        $('.' + gt + '-selectors-type', settings.config_ele).hide();
        $.each($(this).attr("class").split(/\s+/), function() {
          $('.' + gt + '-selectors-type.' + this, settings.config_ele).show();
        });
      });
      if($(this).hasClass(settings.initial_group)) { $(this).trigger('click'); }
    }).end().find('.' + gt + '-selector', '.' + gt + '-selectors-type').each(function() {
        if($(this).text() === settings.initial_tag) { $(this).addClass('selected'); }
        $(this).click(function(e) {
          var self = $(this);
          e.preventDefault();
          $('.' + gt + '-selector', '.' + gt + '-selectors-type').removeClass("selected");
          self.addClass("selected");
          settings.config_activate = false;
          settings.initial_tag = self.text();
          $(obj)[gt]("destroy")[gt](settings);
        });
      });
  },

  methods = {
    init : function(f, options) {
      f = null;
      return this.each(function() {
        var self = $(this), settings = $.extend({}, $.fn[gt].defaults, options);

        if(settings.config_activate) { build_initializer(self,settings); }
        preloader(self,settings);
        self.bind(eventName, { 'item' : settings.initial_tag, settings : settings }, tag_selected);
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
    'initial_group' : 'journal',
    'initial_tag'   : 'author',
    'multitag'      : true,
    'tags'          : {},
//TODO: permit user-supplied tags
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
    'config_ele'      : '#' + gt + '-initializer',
    'config_activate' : true,

    //Callbacks
    'onActivate'        : function(obj, data) { obj = null; data = null; },
    'beforeTagged'      : function(obj) { obj = null; },
    'onTagged'          : function(obj, data) { obj = null; data = null; },
    'onMultitagWarning' : function() { alert('You already used that tag. Please choose another.'); },
    'onOverlapWarning'  : function() { alert('Your selection overlapped with a previously created tag. Please try again.'); }
  };

}(jQuery, 'grabtag'));