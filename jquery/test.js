var demo = function() {
    this.demos = {};
};

demo.prototype = {
    add: function(plugin, options) {
        this.demos[plugin] = options;
    },

    onPropertyChange: function(plugin, test, pId, inx) {
        if (test.handler) {
            test.handler(inx, test.elems);
        }
        if (test.before) test.before(test.elems, inx);
        test.elems[plugin]('pr'+pId);
        if (test.after) test.after(test.elems, inx);
    },

    resetAll: function(plugin) {
        $.each(this.demos[plugin].tests, function() {
            this.selector[0].selectedIndex=0;
            this.selector.change();
        });
    },

    setOption: function(plugin, id, inx) {
        $.each(this.demos[plugin].tests, function() {
            if (this.id!=id) return true;
            this.selector[0].selectedIndex = inx;
            this.selector.change();
        });
    },

    toggleOption: function(plugin, id, mode) {
        $.each(this.demos[plugin].tests, function() {
            if (this.id!=id) return true;
            this.li[mode?'show':'hide']();
            if (!mode) {
                this.selector[0].selectedIndex = 0;
                this.selector.change();
            } else if (!this.li.find('div.folder').is(':visible')) {
                this.li.find('h3').eq(0).click();
            }
        });
    },

    applyOption: function(plugin, id) {
        $.each(this.demos[plugin].tests, function() {
            if (this.id!=id) return true;
            this.selector.change();
        });
    },

    getOption: function(plugin, id) {
        $.each(this.demos[plugin].tests, function() {
            if (this.id!=id) return true;
            return this.presets[ this.selector[0].selectedIndex ].options || this.selector[0].selectedIndex;
        });
    },

    generateCode: function(plugin, renderTo) {
        var code = '<pre>$().'+plugin+"({\n";
        var options = {};
        $.each(this.demos[plugin].tests, function() {
            if (this.selector[0].selectedIndex==0) return true;
            $.extend(options, this.presets[this.selector[0].selectedIndex].options);
        });
        code += this.serialize(options, 1);
        if (options) code += "\n";
        code += '});</pre>';
        renderTo.html(code).show();
    },

    showDoc: function(plugin, target, ref) {
        if (!this.demos[plugin].doc) {
            var th = this;
            return this.loadDoc(plugin, function(){
                th.showDoc(plugin, target, ref);
            });
        }

        var refArr = ref.split(',');
        var th = this;
        $.each(refArr, function(i) {
            var entry = th.demos[plugin].doc.find('plugin[name='+plugin+']').find('option[name='+refArr[i]+']');
            var v = jQuery.trim(entry.attr('values'));
            target.append(
                  '<p><b>'+jQuery.trim(entry.attr('name'))+'</b> -- '+jQuery.trim(entry.attr('format'))+'<br>'
                +'default: '+jQuery.trim(entry.attr('default'))
                +(v? '<br>'+v : '')
                +'</p>'
            );
            var descr = jQuery.trim(entry.find('description').text());
            if (descr) target.append('<p>'+descr+'</p>');

            entry.find('value').each(function(){
                var value = $(this);
                target.append(
                     '<p><b>'+jQuery.trim(value.attr('type'))+':</b> '
                    +jQuery.trim(value.text())
                    +'</p>'
                );
            });

            entry.find('note').each(function(){
                var note = jQuery.trim($(this).text());
                target.append('<p class=quote>'+note+'</p>');
            });
        });

        target.show();
    },

    loadDoc: function(plugin, callback) {
        var th = this;
        $.ajax({
                url: this.demos[plugin].docURL,
                dataType: ($.browser.msie) ? "text" : "xml",
                before: function() {
                    window.loader.start();
                },
                success: function(data){
                    var xml;
                    if (typeof data == "string") {
                        xml = new ActiveXObject("Microsoft.XMLDOM");
                        xml.async = false;
                        xml.loadXML(data);
                    } else {
                        xml = data;
                    }
                    th.demos[plugin].doc = $(xml);
                    window.loader.stop();
                    if (callback) callback();
                }
        });
    },

    serialize: function(obj, level) {
        var str = '';
        var i = 0;
        var th = this;
        $.each(obj, function(k, v) {
            if (i>0) str += ",\n";
            for (var j = 0; j < level; j++) str += "\t";
            str += k+': ';
            switch (typeof v) {
                case 'number': { str += v; break;}
                case 'string': { str += '"'+v+'"'; break; }
                case 'boolean': { str += v ? 'true' : 'false'; break; }
                case 'object': {
                    str += $.isArray(v) ? "[": "{\n";
                    str += th.serialize(v, level+1);
                    if ($.isArray(v)) str += ']';
                    else {
                        str += "\n";
                        for (var j = 0; j < level; j++) str += "\t";
                        str += "}";
                    }
                    break;
                }
            }
            i++;
        });
        return str;
    },

    render: function() {
        var demo = this;
        var pId = 0;

        $.each(this.demos, function(i){
            if (!this.renderTo) return true;
            var container = $(this.renderTo);
            var plugin = i;

            container.append('<h2>'+this.name+'</h2>');
            if (this.description) container.append('<p>'+this.description+'</p>');
            var list = $('<ul class=props></ul>');
            container.append(list);

            $.each(this.tests, function() {

                var test = this;
                var li = $('<li class=prop></li>');
                if (this.liClass) li.addClass(this.liClass);
                var header = $('<h3>'+this.name+'</h3>');
                var folder = $('<div class=folder></div>').hide();

                header.bind('click', function() { folder.toggle('fast'); });
                li.append(header);

                if (this.description) folder.append('<p>'+this.description+'</p>');

                var select = $('<select></select>');
                this.selector = select;
                this.li = li;

                $.each(this.presets, function() {
                    this.pId=pId;
                    var option = $('<option value='+pId+'>'+this.name+'</option>');
                    $.fn[plugin].presets['pr'+pId] = this.options;
                    select.append(option);
                    pId++;
                });

                select.bind('change', function() {
                    demo.onPropertyChange(plugin, test, $(this).val(), this.selectedIndex);
                });

                folder.append(select);

                if (this.docref) {
                    var ref = $('<div class=docref>Documentation</div>');
                    var doc = $('<div class=doc></div>');
                    var th = this;
                    ref.bind('click', function() {
                        if (doc.text()=='') demo.showDoc(plugin, doc, th.docref);
                        else doc.toggle();
                    });
                    folder.append(ref).append(doc);
                }

                li.append(folder);
                list.append(li);
                if (this.hidden) li.hide();
            });

            var control = $('<li class="prop control"></li>');
            var reset = $('<button>Reset all</button>');
            var expand = $('<button>Expand all</button>');
            var collapse  = $('<button>Collapse all</button>');
            var code  = $('<button>Generate code</button>');
            reset.bind('click', function() { demo.resetAll(plugin); });
            expand.bind('click', function() { $('div.folder', list).show(); });
            collapse.bind('click', function() { $('div.folder', list).hide(); });
            control.append(reset).append(expand).append(collapse);
            list.prepend(control);

            var code = $('<li class="prop control"></li>');
            var gen = $('<button>Generate code</button>');
            var hideCode = $('<button>Hide</button>').hide();
            var display = $('<div class=code></div>').hide();
            gen.bind('click', function() {
                demo.generateCode(plugin, display);
                display.show();
                hideCode.show();
            });
            hideCode.bind('click', function() {
                display.hide();
                hideCode.hide();
            });
            code.append(gen).append(hideCode).append(display);
            list.append(code);
        });
    }
};
