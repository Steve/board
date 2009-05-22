/*
 * jQuery Dynamic Library 3
 *
 * http://code.google.com/p/jquery-dynamic/
 * licensed under the MIT license
 *
 * author: john kuindji
 */

(function($){

var windowLoaded = false;
$(window).one('load', function(){ windowLoaded=true; });
var allHandles = ['w','s','e','n','sw','se','ne','nw'];
var opCorners = {s: 'nw', se: 'nw', e: 'nw', sw: 'ne', w: 'ne', ne: 'sw', n: 'sw', nw: 'se'};

var observable = {

    /* local events system is used for connection between resizable and draggable
     * it is much faster, though doesn't allow to use .bind() and namespaces
     * also there is no unbind() function
     * */
    events: {},

    localBind: function(name, fn, scope) {
        if (arguments.length==3) {
            var bind = {};
            bind[name]=fn;
        }
        else {
            var bind = name;
            scope = fn;
        }
        for (var name in bind) {
            if (!bind[name]) continue;
            if (this.events[name] == undefined) this.events[name] = [];
            this.events[name].push({
                fn: bind[name],
                scope: scope
            });
        }
        return this;
    },

    localTrigger: function(name, eventData) {
        if (this.events[name] == undefined) return true;
        var i = this.events[name].length;
        var res = -1;
        while (i--, i>=0) {
            var e = this.events[name][i];
            res = e.fn.call(e.scope, eventData);
            if (res  == false) return res;
        }
        return res;
    },

    /* jquery 1.3 required as we use multiple namespaces
     */
    bind: function(name, fn, subspace) {
        if (!fn) return this;
        var type = name+'.'+this.eventNamespace;
        if (subspace) type += '.'+subspace;
        this.o.unbind(type);
        this.o.bind(type, fn);
        this.wrapEventHandle(name);
        return this;
    },

    /* the inner trigger checks for unwrapper handlers (this is the performance bottleneck :( )
     * and also returns the result, so we can stop farther processing if false is returned.
     */
    trigger: function(name, eventData, skipCheck) {
        if (this.localEvents) return this.localTrigger(name, eventData);
        if (!skipCheck && this.wrapEventHandle(name)===false) return; // we should skip checking while dragging or resizing
        var event = jQuery.Event({type: name+'.'+this.eventNamespace});
        this.o.trigger(event, eventData);
        return event.result;
    },

    /* this is kinda dirty hack for $.fn.trigger function. It works only for custom events,
     * wrapping them into a simple function which makes sure than all handlers are
     * called in the right scope (not DOM object and not the bound object's scope).
     * So $().bind('start.draggable') will use custom scope, but $().bind('click') will use DOM as scope.
     * This allows to use jquery's bind mechanism for cross-plugin events.
     *****************************************************************/
    wrapEventHandle: function(name) {
        var events = jQuery.data(this.dom, 'events');
        if (!events || !events[name]) return false;
        var th = this;

        $.each(events[name], function(i) {
            if (this.dnmcModified) return true;
            if (this.type.indexOf(th.eventNamespace) < 0) return true;
            var original = this;
            events[name][i] = function() {
                return original.call(th.opt.scope, arguments[1]);
            };
            events[name][i].type = original.type;
            events[name][i].guid = original.guid;
            events[name][i].dnmcModified = true;
        });
    }
};

/* Dynamic
 *
 * this class handles all the actual positioning and resizing
 * draggable, droppable and resizable are just managers that operate the objects of this class
 *****************************************************************/

var dynamic = function(dom) {
    this.dom = dom;
    this.o = $(dom);
    this.positionGrid = this.gridStart = this.sizeGrid = this.bounds = this.ratio =
        this.cssPosition = this.offset = this.position = this.margin = this.size = this.sizeRelated = this.cssSize =
        this.sParent = this.oParent = this.scrollIsRoot = this.offsetIsRoot = this.so = this.po = this.r =
        this.scrollIsOuter = this.min = this.max = this.rectCache = false;
    this.checkPositionGrid = this.checkResizeGrid = this.checkRatio = true;
    this.sizeGridStart = 'nw'; // nw, ne, sw, se
    this.ratioCorrectionMode = 'w';
    this.sizeChangeOnly = false;
};

dynamic.prototype = {

    scrollParent: function() {
        var scrollParent = this.o.parents().filter(function() {
            return (/(auto|scroll)/).test($.curCSS(this,'overflow',1)+$.curCSS(this,'overflow-y',1)+$.curCSS(this,'overflow-x',1));
        }).eq(0);
        return !scrollParent.length ? $(document) : scrollParent;
    },

    prepare: function() { return this.prepareGeneral().prepareSizeRelated().preparePosition(); },

    prepareGeneral: function() {
        this.prepareAbsolute();
        var oParent = this.o.offsetParent(),
             sParent = this.scrollParent(),
             r = {top: 0, left: 0},
             po = false,
             scrollIsOuter = false;
        var scrollIsRoot = sParent[0] == document || /body|html/i.test(sParent[0].tagName),
             offsetIsRoot = oParent[0] == document || /body|html/i.test(oParent[0].tagName),
             elem = sParent;

        if (!scrollIsRoot && !offsetIsRoot) {
            while ( (elem = elem.parent()) && !(elem[0] == document || /body|html/i.test(elem[0].tagName))) {
                if (elem[0] == sParent[0]) { scrollIsOuter = true; break; }
            }
        }

        if (!offsetIsRoot) po = oParent.offset();
        if (!po) po = {left: 0, top: 0, bl: 0, bt: 0};
        else { po.bl = 0; po.bt = 0; }

        if (offsetIsRoot && !scrollIsRoot && 'fixed' != this.cssPosition && 'static' != sParent.css('position')) {
            po.bl = parseInt( sParent.css('borderLeftWidth'), 10)||0;
            po.bt = parseInt( sParent.css('borderTopWidth'), 10)||0;
        } else if (!offsetIsRoot) {
            po.bl = parseInt( oParent.css('borderLeftWidth'), 10)||0;
            po.bt = parseInt( oParent.css('borderTopWidth'), 10)||0;
        }

        if ('relative' == this.cssPosition) {
            if (offsetIsRoot && scrollIsRoot) {
                r = {
                    left: (parseInt(this.o.css('left'),10)||0) - this.offset.left,
                    top: (parseInt(this.o.css('top'),10)||0) - this.offset.top
                };
            }
            else {
                r = {
                    left: -(this.offset.left - po.left - (parseInt(this.o.css('left'),10)||0) - po.bl - this.margin.left
                        + (!scrollIsRoot ? sParent.scrollLeft() : 0)
                    ),
                    top: -(this.offset.top - po.top - (parseInt(this.o.css('top'),10)||0) - po.bt - this.margin.top
                        + (!scrollIsRoot ? sParent.scrollTop() : 0)
                    )
                };
            }
        }
        this.sParent = sParent;
        this.oParent = oParent;
        this.po = po;
        this.r = r;
        this.scrollIsRoot = scrollIsRoot;
        this.offsetIsRoot = offsetIsRoot;
        this.scrollIsOuter = scrollIsOuter;
        return this;
    },

    afterDOMPositionChange: function() {
        var ofs = {left: this.offset.left, top: this.offset.top};
        this.prepareGeneral();
        this.offset = {left: ofs.left, top: ofs.top};
        this.preparePosition().update('position');
    },

    prepareAbsolute: function() {
        var o = this.o;
        this.cssPosition = o.css('position');
        this.offset = o.offset();
        this.size = {
            width: parseInt(o.outerWidth()||o.css('width')||this.dom.style.width, 10)||0,
            height: parseInt(o.outerHeight()||o.css('height')||this.dom.style.height, 10)||0
        };
        this.margin = {top: parseInt(o.css('marginTop'), 10)||0, left: parseInt(o.css('marginLeft'), 10)||0};
        this.rectCache = false;
        return this;
    },

    prepareSizeRelated: function() {
        var o = this.o;
        this.cssSize = {
            width: parseInt(o[$.boxModel ? 'width':'outerWidth']() || o.css('width') || this.dom.style.width, 10)||0,
            height: parseInt(o[$.boxModel ? 'height':'outerHeight']() || o.css('height') || this.dom.style.height, 10)||0
        };
        this.sizeRelated = {
            bl: parseInt(o.css('borderLeftWidth'), 10)||0,
            bt: parseInt(o.css('borderTopWidth'), 10)||0,
            br: parseInt(o.css('borderRightWidth'), 10)||0,
            bb: parseInt(o.css('borderBottomWidth'), 10)||0,
            pl: parseInt(o.css('paddingLeft'), 10)||0,
            pt: parseInt(o.css('paddingTop'), 10)||0,
            pr: parseInt(o.css('paddingRight'), 10)||0,
            pb: parseInt(o.css('paddingBottom'), 10)||0
        };
        return this;
    },

    preparePosition: function() {
        this.position = this.convertPosition(this.offset, 'relative');
        return this;
    },

    convertPosition: function(pos, to) {
        var mod = to=='relative' ? 1: -1, cssPos = this.cssPosition, r = this.r, po = this.po, m = this.margin,
              srt = this.scrollIsRoot, ort = this.offsetIsRoot, sp = this.sParent;
        if ('absolute'== cssPos && ort) var smod = 0;
        else if ('fixed' == cssPos) var smod = 0;
        else if ('relative' == cssPos) var smod = srt ? 0 : mod;
        else var smod = srt || this.scrollIsOuter ? 0: mod;
        var mmod = 'relative'==cssPos && mod==1 && ort && srt ? 0 : mod;

        return {
            left: (
                pos.left
                + r.left * mod // some magical number of pixels... I can't explain it even for myself
                - po.left * mod // parent offset
                - m.left * mmod // margins
                - po.bl * mod // parent border
                + (smod != 0 ? sp.scrollLeft() * smod: 0) // parent scroll
                - ('fixed' == cssPos ? $(document).scrollLeft() : 0)
            ),
            top: (
                pos.top
                + r.top * mod
                - po.top * mod
                - m.top * mmod
                - po.bt * mod
                + (smod != 0 ? sp.scrollTop() * smod : 0)
                - ('fixed' == cssPos ? $(document).scrollTop() : 0)
            )
        };
    },

    convertSize: function(size, to) {
        if (!$.support.boxModel) return {width: size.width, height: size.height};
        if (!this.sizeRelated) this.prepareSizeRelated();
        var mod = to == 'inner' ? 1 : -1, sr = this.sizeRelated;
        return {
            width: (
                size.width
                - sr.bl * mod
                - sr.br * mod
                - sr.pl * mod
                - sr.pr * mod
            ),
            height: (
                size.height
                - sr.bt * mod
                - sr.bb * mod
                - sr.pt * mod
                - sr.pb * mod
            )
        };
    },

    rect: function(refresh, increase) {
        if (!this.position) this.prepareGeneral().preparePosition();
        var offset = this.convertPosition(this.position, 'absolute'), s = this.size;
        increase = parseInt(increase,10)||0;
        if (!this.rectCache) this.rectCache = {
            x1: offset.left, x2: offset.left+s.width,
            y1: offset.top, y2: offset.top+s.height
        };
        var rc = this.rectCache;
        return {
            x1: rc.x1-increase, x2: rc.x2+increase,
            y1: rc.y1-increase, y2: rc.y2+increase,
            w: s.width, h: s.height
        };
    },

    setPositionGrid: function(grid, start) {
        if (!start) start = {x: 0, y: 0};
        this.gridStart = start;
        this.positionGrid = grid;
        this.update('position');
        return this;
    },
    clearPositionGrid: function() {
        this.potisionGrid = false;
        this.gridStart = false;
        return this;
    },

    setSizeGrid: function(grid, start) {
        if (!start) start = 'nw';
        this.sizeGrid = grid;
        this.sizeGridStart = start;
        this.update('size');
        return this;
    },
    clearSizeGrid: function() {
        this.sizeGrid = false;
        this.sizeGridStart = false;
        return this;
    },

    setBounds: function(rect) { this.bounds = rect; return this;},
    clearBounds: function() { this.bounds = false; return this; },
    setMinSize: function(size) { this.min = size; return this; },
    setMaxSize: function(size) { this.max = size; return this; },
    setRatio: function(ratio) { this.ratio = ratio; return this; },

    getBounds: function() {
        var b = this.bounds;
        if (!b) return false;
        return {
                x1: typeof b.x1 == 'function' ? b.x1(this.o) : b.x1 == undefined ? -5000 : b.x1,
                x2: typeof b.x2 == 'function' ? b.x2(this.o) : b.x2 == undefined ? 10000 : b.x2,
                y1: typeof b.y1 == 'function' ? b.y1(this.o) : b.y1 == undefined ? -5000 : b.y1,
                y2: typeof b.y2 == 'function' ? b.y2(this.o) : b.y2 == undefined ? 1000 : b.y2
        };
    },

    correctPosition: function() {
        if (!this.positionGrid && !this.bounds) return this;
        var p = this.position, gs = this.gridStart, pg = this.positionGrid, ofs = this.offset;
        if (pg && this.checkPositionGrid) {
            p.left = gs.x + Math.round((p.left-gs.x)/pg.x) * pg.x;
            p.top = gs.y + Math.round((p.top-gs.y)/pg.y) * pg.y;
        }
        if (this.bounds) {
            var bounds = this.getBounds();
            var rect  = {
                x1: ofs.left, x2: ofs.left + this.size.width,
                y1: ofs.top, y2: ofs.top + this.size.height
            };
            if (rect.x2-rect.x1 <= bounds.x2-bounds.x1) { // we need to make sure that object can fit into bounds
                if (rect.x1 < bounds.x1) p.left += bounds.x1-rect.x1;
                if (rect.x2 > bounds.x2) p.left -= rect.x2-bounds.x2;
            }
            if (rect.y2 - rect.y1 <= bounds.y2 - bounds.y1) {
                if (rect.y1 < bounds.y1) p.top += bounds.y1-rect.y1;
                if (rect.y2 > bounds.y2) p.top -= rect.y2-bounds.y2;
            }
        }
        return this;
    },

    correctSize: function() {
        if (!this.min && !this.max && !this.ratio && !this.sizeGrid) return this;
        var ofs = this.ofs, sgs = this.sizeGridStart, min = this.min, max = this.max, ratio = this.ratio, cs = this.cssSize;
        var size = this.convertSize(cs, 'outer');
        if (size.width < 1) size.width = 1;
        if (size.height < 1) size.height = 1;

        if (this.sizeGrid && this.checkResizeGrid) {
            var w = (Math.round(size.width/this.sizeGrid.x) * this.sizeGrid.x);
            var xdiff = w - size.width;
            var h = (Math.round(size.height/this.sizeGrid.y) * this.sizeGrid.y);
            var ydiff = h - size.height;
            if (/s/.test(sgs)) { ofs.top -= ydiff; size.height = h; }
            if (/e/.test(sgs)) { ofs.left -= xdiff; size.width = w; }
            if (/n/.test(sgs)) size.height += ydiff;
            if (/w/.test(sgs)) size.width += xdiff;
            this.position = this.convertPosition(ofs, 'relative');
            cs = this.convertSize(size, 'inner');
        }
        if (min && min.w != undefined && cs.width<min.w) cs.width=min.w;
        if (min && min.h != undefined && cs.height<min.h) cs.height=min.h;
        if (max && max.w != undefined && cs.width>max.w) cs.width=max.w;
        if (max && max.h != undefined && cs.height>max.w) cs.height=max.h;
        if (ratio && this.checkRatio) {
            if (this.ratioCorrectionMode=='w') cs.height = Math.round(cs.width / ratio);
            if (this.ratioCorrectionMode=='h') cs.width = Math.round(cs.height * ratio);
        }
        if (cs.width < 1) cs.width=1;
        if (cs.height < 1) cs.height=1;
        this.cssSize = cs;
        return this;
    },

    update: function(what, animate, easing, callback) {
        if (!what) what = 'both';
        if (what == 'position' || what == 'both') this.correctPosition();
        if (what == 'size' || what == 'both') this.correctSize();
        var style = this.dom.style, cs = this.cssSize, p = this.position, sco = this.sizeChangeOnly;
        if (!animate) {
            if (what == 'size' || what == 'both') {
                if (sco != 'h') style.width = Math.round(cs.width)+'px';
                if (sco != 'w') style.height = Math.round(cs.height)+'px';
            }
            if (what == 'position' || what == 'both') {
                style.left = Math.round(p.left)+'px';
                style.top = Math.round(p.top)+'px';
            }
            if (callback) callback.call(this);
        } else {
            var th = this, upd = {};
            if (!easing) easing = null;
            if (what == 'size' || what == 'both') { upd.width = cs.width; upd.height = cs.height; }
            if (what == 'position' || what == 'both') {  upd.left= p.left; upd.top= p.top; }
            this.o.animate( upd, animate, easing, function() { if (callback) callback.call(th); } );
        }
        return this;
    },

    underPointer: function(event) {
        var rect = this.rect();
        return event.pageX>rect.x1 && event.pageX < rect.x2 && event.pageY > rect.y1 && event.pageY < rect.y2;
    },

    // does this object meet the intersection criteria
    // for instance: does it fit into the given coordinates.
    intersect: function(coords, tolerance, mode, distance) {
        var cur = this.rect(), size = this.size;

        if (typeof tolerance == 'string') switch (tolerance) {
            case 'intersect': {
                if (((cur.y1 > coords.y1 ? cur.y2 - coords.y1 : coords.y2-cur.y1) <
                        size.height + (coords.y2-coords.y1))
                 && ((cur.x1 > coords.x1 ? cur.x2-coords.x1 : coords.x2-cur.x1) <
                        size.width + (coords.x2-coords.x1))) return true;
                break;
            }
            case 'fit': {
                if (coords.x1 <= cur.x1 && coords.x2 >= cur.x2 && coords.y1 <= cur.y1 && coords.y2 >= cur.y2) return true;
                break;
            }
            case 'snap': {
                // the intersection should be already checked
                if (mode == 'outer') {
                    if (Math.abs(coords.x2 - cur.x1) < distance) return 'l';
                    if (Math.abs(coords.y2 - cur.y1) < distance) return 't';
                    if (Math.abs(coords.x1 - cur.x2) < distance) return 'r';
                    if (Math.abs(coords.y1 - cur.y2) < distance) return 'b';
                }
                else { // inner
                    if (Math.abs(coords.x1-distance-cur.x1) < distance) return 'l';
                    if (Math.abs(coords.y1-distance-cur.y1) < distance) return 't';
                    if (Math.abs(coords.x2+distance-cur.x2) < distance) return 'r';
                    if (Math.abs(coords.y2+distance-cur.y2) < distance) return 'b';
                }
            }
        }
        if (typeof tolerance == 'number') {
            if (!this.intersect(coords, tolerance >= 1 ? 'fit' : 'intersect')) return false;
            var ydiff = cur.y1 > coords.y1 ? coords.y2 - cur.y1 : cur.y2 - coords.y1;
            var xdiff = cur.x1 > coords.x1 ? coords.x2 - cur.x1 : cur.x2 - coords.x1;
            return  (xdiff*100/size.width)/100 >= tolerance && (ydiff*100/size.height)/100 >= tolerance;
        }
        return false;
    },

    // another piece of code taken from jquery UI
    enableSelection: function() { this.o.attr('unselectable', 'off').css('MozUserSelect', '').unbind('selectstart.dnmc'); },
    disableSelection: function() {
       this.o.attr('unselectable', 'on').css('MozUserSelect', 'none')
                .bind('selectstart.dnmc select.dnmc dragstart.dnmc', function() { return false; });
    }
};

/* Droppable
 *****************************************************************/

var droppable = function(dom) {
    var o = this.o = $(dom);
    this.dom = dom;
    this.events = {};
    var d = o.data('dynamic');
    if (d == undefined) {
        o.data('dynamic', new dynamic(dom));
        d = o.data('dynamic');
    }
    this.dynamic = d;
    this.dynamic.prepareAbsolute();
    this.opt = { accept: true, tolerance: 'pointer', cls: {}, group: false, scope: false, data: false };
    this.lastDraggable = this.curDraggable = this.localEvents = false;
    this.eventNamespace = 'droppable';
};

droppable.prototype = $.extend({}, observable, {

    toggle: function(mode) {
        if (mode=='enable'||mode===true) { this.o.addClass('dnmc-droppable'); return; }
        if (mode=='disable'||mode===false) { this.o.removeClass('dnmc-droppable'); return; }
        this.o[ this.o.hasClass('dnmc-droppable') ? 'removeClass':'addClass' ]('dnmc-droppable');
        return this;
    },

    setOptions: function(options, preset) {
        var opt = this.opt;
        if (!preset) preset = 'default';
        var cls = false;
        if (opt.cls && options.cls) cls=$.extend({}, opt.cls, options.cls);
        $.extend(opt, options);
        if (cls) opt.cls = cls;
        if (!opt.scope || opt.scope == 'dom') opt.scope = this.dom;
        if (opt.scope == 'dnmc') opt.scope = this;
        this.bind('over', opt.over, preset).bind('out', opt.out, preset).bind('drop', opt.drop, preset)
             .bind('activate', opt.activate, preset).bind('deactivate', opt.deactivate, preset);
    },

    rect: function() { return this.dynamic.rect(); },

    eventData: function(e, extend) {
        var d = {
            self: this.o,
            draggable: this.lastDraggable,
            data: this.opt.data,
            event: e
        };
        return extend ? $.extend(d, extend) : d;
    },

    accept: function(draggable) {
        var opt = this.opt;
        if (typeof opt.accept == 'boolean') return opt.accept;
        if (typeof opt.accept == 'string') return draggable.is(opt.accept);
        if ($.isFunction(opt.accept)) return opt.accept.call(opt.scope, draggable);
        return typeof opt.accept == draggable[0];
    },

    activate: function(draggable) {
        if (draggable[0] == this.dom) return false;
        if (this.opt.cls.active) this.o.addClass(this.opt.cls.active);
        this.dynamic.prepareAbsolute();
        this.lastDraggable = draggable;
        this.trigger('activate', this.eventData());
    },

    deactivate: function() {
        var opt = this.opt;
        if (opt.cls.active) this.o.removeClass(opt.cls.active);
        if (opt.cls.over) this.o.removeClass(opt.cls.over);
        this.trigger('deactivate', this.eventData());
        this.lastDraggable = false;
    },

    over: function(eData) {
        if (this.opt.cls.over) this.o.addClass(this.opt.cls.over);
        return this.trigger('over', this.eventData(eData.event, {helper: eData.helper, placeholder: eData.placeholder}));
    },

    out: function(eData) {
        if (this.opt.cls.over) this.o.removeClass(this.opt.cls.over);
        return this.trigger('out', this.eventData(eData.event, {helper: eData.helper, placeholder: eData.placeholder}));
    },

    drop: function(eData) {
        return this.trigger('drop', this.eventData(eData.event, {helper: eData.helper, placeholder: eData.placeholder}));
    }
});

/* Common
 *****************************************************************/

var dnrCommon = {

    getBoundsFromContainer: function(){
        var container = false;
        if (this.opt.container === true) container = this.dynamic.offsetIsRoot? this.dynamic.sParent : this.dynamic.oParent;
        if (typeof this.opt.container == 'string') {
            if (this.opt.container == 'parent') container = this.o.parent();
            else container = $(this.opt.container);
        }
        if (!container || !container.length) container = $(document);
        var isRoot = container[0]==document || /html|body/i.test(container[0].tagName);
        if (!isRoot) {
            var ofs = container.offset();
            var bt = parseInt(container.css('borderTopWidth'))||0;
            var bl = parseInt(container.css('borderLeftWidth'))||0;
            return {
                x1: ofs.left+bl,
                x2: ofs.left+bl+container.innerWidth(),
                y1: ofs.top+bt,
                y2: ofs.top+bt+container.innerHeight()
            };
        };
        return {
            x1: function() { return container.scrollLeft(); },
            y1: function() { return container.scrollTop(); },
            x2: function() { return container.scrollLeft()+$(window).width(); },
            y2: function() { return container.scrollTop()+$(window).height(); }
        };
    },

    createIframeFix: function() { // taken from the jQueryUI. There is nothing to do in a different way, so we use the best :)
        $(this.opt.iframeFix === true ? "iframe" : this.opt.iframeFix).each(function() {
            $('<div class="dnmc-iframe-fix" style="background: #fff;"></div>')
            .css({
                width: this.offsetWidth+"px", height: this.offsetHeight+"px",
                position: "absolute", opacity: "0.001", zIndex: 9999
            })
            .css($(this).offset()).appendTo("body");
        });
    },

    removeIframeFix: function() { $("div.dnmc-iframe-fix").each(function() { this.parentNode.removeChild(this); }); },

    /* snapping
     *********************************************************/
    initSnap: function(exclude, def) {
        var snap = [];
        $((this.opt.snap!==true? this.opt.snap : def)).not(exclude).not('.dnmc-resize').each(function(){
            var elem = $(this), d = elem.data('dynamic');
            if (d==undefined) {
                elem.data('dynamic', new dynamic(this));
                d = elem.data('dynamic')
            }
            d.prepareGeneral().preparePosition().rect();
            snap.push({elem: elem, s: false, dnmc: d});
        });
        this.snap = snap;
    },
    clearSnap: function() { this.snap = this.snapped  = false; },

    unSnap: function(e){
        var opt = this.opt, snpd = this.snapped;
        for (var side in snpd) {
            if (!snpd[side]) continue;
            if ((side=='t'||side=='b')&&Math.abs(snpd[side].my-e.pageY)>opt.snapTolerance) {
                this.trigger('snapRelease', this.eventData(e, {target: snpd[side].elem.elem, side: side}));
                if (opt.cls.snapTarget) snpd[side].elem.elem.removeClass(opt.cls.snapTarget);
                snpd[side]=snpd[side].elem.s[side]=false;
            }
            if ((side=='l'||side=='r')&&Math.abs(snpd[side].mx-e.pageX)>opt.snapTolerance) {
                this.trigger('snapRelease', this.eventData(e, {target: snpd[side].elem.elem, side: side}));
                if (opt.cls.snapTarget) snpd[side].elem.elem.removeClass(opt.cls.snapTarget);
                snpd[side]=snpd[side].elem.s[side]=false;
            }
        }
        for (var side in snpd) if (typeof snpd[side] == 'object') return true;
        if (opt.cls.snapped) this.moving.removeClass(opt.cls.snapped);
        this.snapped = false;
    },

    checkSnap: function(e) {
        var opt = this.opt, d = this.dynamic, snpd = this.snapped, snp = this.snap;

        d.rectCache=false; // we need to reset cache before check intersection
        for (var i = 0, len = snp.length; i<len; i++) {
            var s = snp[i];
            if (opt.snapMode != 'inner') {
                if (!d.intersect(s.dnmc.rect(false, opt.snapTolerance), 'intersect')) {
                    if (!s.s) continue;
                    for (var j in s.s) snpd[j] = false;
                    s.s = false; continue;
                }
                var side = d.intersect(s.dnmc.rect(false, opt.snapTolerance), 'snap', 'outer', opt.snapTolerance);
                if (side && !snpd[side]) this.doSnap(side, true, snp[i], e);
            }
            if (opt.snapMode != 'outer') {
                if (!d.intersect(s.dnmc.rect(), 'fit')) {
                    if (!s.s) continue;
                    for (var j in s.s) { if (!snpd[j] || snpd[j].mode=='outer') continue;
                        snpd[j] = false;
                        s.s[j] = false;
                    }
                    if (!s.s.t && !s.s.r && !s.s.b && !s.s.l) s.s=false;
                    continue;
                }
                var side = d.intersect(s.dnmc.rect(false, -opt.snapTolerance), 'snap', 'inner', opt.snapTolerance);
                if (side && !snpd[side]) this.doSnap(side, false, snp[i], e);
            }
        }
    },

    mouseDelay: function(e, callback, scope) {
        var opt = this.opt, dom = this.dom, th = this;
        if (!opt.distance && !opt.delay) return callback.call(scope, e);

        if (opt.distance) {
            $(dom.ownerDocument).bind('mouseup.dnmc', function() { $(dom.ownerDocument).unbind('mousemove.dnmc'); });
            this.preClick = {x: e.pageX, y: e.pageY};
            $(dom.ownerDocument).bind('mousemove.dnmc', function(e) {
                if (Math.abs(e.pageX-th.preClick.x) >= opt.distance ||
                     Math.abs(e.pageY-th.preClick.y) >= opt.distance) {
                    $(dom.ownerDocument).unbind('mousemove.dnmc');
                    callback.call(scope, e);
                }
            });
            return false;
        }
        if (opt.delay) {
            $(dom.ownerDocument).bind('mouseup.dnmc', function(){
                window.clearTimeout(th.timer);
                th.timer = false;
                $(dom.ownerDocument).unbind('mouseup.dnmc');
            });
            this.timer = window.setTimeout(function(){
                $(dom.ownerDocument).unbind('mouseup.dnmc');
                callback.call(scope, e);
            }, opt.delay);
            return false;
        }
    },

    checkKey: function(name, e) {
        if (!this.opt.withKey || !this.opt.withKey[name]) return true;
        var key = this.opt.withKey[name].split('|');
        for (var i = 0, len = key.length; i < len; i++) {
            if (key[i]=='none' && !(e.ctrlKey||e.shiftKey||e.altKey)) return true;
            if (key[i]=='any' && (e.ctrlKey||e.shiftKey||e.altKey)) return true;
            if (e[key[i]+'Key']) return true;
        }
        return false;
    }
};

/* Draggable
 *****************************************************************/

var draggable = function(dom) {
    var o = this.o = $(dom);
    this.dom = dom;
    this.events = {};
    this.moving = this.o;
    var d = o.data('dynamic');
    if (d == undefined) {
        o.data('dynamic', new dynamic(dom));
        d = o.data('dynamic');
    }
    this.dynamic = d;
    this.eventNamespace = 'draggable';
    this.opt = {
        helper: false, destroyHelper: true, opacity: false, animate: false, easing: false, cls: {},
        axis: false, restore: false, bound: false, scroll: false, scrollStep: 20, scrollSensitivity: 20, scrollOutside: false,
        zIndex: 1000, cancel: ':input', cursorAt: false, delay: false, distance: false, handle: this.o,
        snap: false, snapTolerance: 20, snapMode: 'both', stack: false, renew: true, placeholder: false,
        grid: false, gridStart: false, keyboard: false, keyStep: 5, keyTime: 100, keyboardOnly: false,
        target: '.dnmc-droppable', targetGroup: false, targetOptions: false, iframeFix: false, container: false,
        scope: false, data: null, unselectable: true, withKey: false, hide: false, helperAppendTo: false,
        preserveCursor: false
    };
    this.enabled = this.envCached = this.dropCached = this.snapCached = this.focus = this.localEvents = false;
    this.resetVars();
};

$.extend(draggable.prototype, observable, dnrCommon, {

    /* public API
     *****************************************************************/

    toggle: function(mode) {
        if ((mode=='disable'||mode===false)&&this.enabled) return this.setEvents('off');
        if ((mode=='enable'||mode===true)&&!this.enabled) return this.setEvents('on');
    },

    setEvents: function(mode) {
        var th = this, opt = this.opt, o = this.o;

        if (mode=='on') {
            if (!opt.keyboard||!opt.keyboardOnly) {
                $(function(){
                    opt.handle.bind('mousedown.dnmc', function(e) { return th.mouseDown.call(th, e); });
                    if (opt.cancel) $(opt.cancel, o).bind('mousedown.dnmc', function(e){ e.stopPropagation(); return true; });
                });
            }
            this.enabled = true;
            o.addClass('dnmc-draggable');
            if (opt.cls.active) o.addClass(opt.cls.active);
            if (opt.keyboard) this.initFocusElement();
            if (opt.unselectable) this.dynamic.disableSelection();
            this.trigger('enabled',  this.eventData());
        }
        if (mode=='off') {
            if (!opt.keyboard||!opt.keyboardOnly) {
                opt.handle.unbind('mousedown.dnmc');
                if (opt.cancel) $(opt.cancel, o).unbind('mousedown.dnmc');
            }
            this.enabled = false;
            o.removeClass('dnmc-draggable');
            if (opt.cls.active) o.removeClass(opt.cls.active);
            if (opt.keyboard) this.removeFocusElement();
            if (opt.unselectable) this.dynamic.enableSelection();
            this.trigger('disabled', this.eventData());
        }
        return this;
    },

    setOptions: function(options, preset) {
        if (!preset) preset = 'default';
        var cls = false, opt = this.opt;
        if (opt.cls && options.cls) cls=$.extend({}, opt.cls, options.cls);
        $.extend(opt, options);
        if (cls) opt.cls = cls;
        if (!$.easing) opt.easing = null;
        if (!opt.scope || opt.scope == 'dom') opt.scope = this.dom;
        if (opt.scope == 'dnmc') opt.scope = this;
        if (typeof opt.handle == 'string') opt.handle = $(opt.handle, this.o);
        if (!opt.handle || opt.handle.length==0) opt.handle = this.o;
        if (opt.grid && typeof opt.grid !='object') opt.grid = {x: opt.grid, y: opt.grid};
        if (opt.distance && opt.delay) opt.delay = false;
        if (opt.cursorAt) opt.grid = false;
        if (!opt.stack && typeof opt.zIndex != 'number') opt.zIndex = 1000;
        if (!opt.cls) opt.cls = {};
        this.bind('beforeStart', opt.beforeStart, preset).bind('start', opt.start, preset).bind('drag', opt.drag, preset)
             .bind('beforeEnd', opt.beforeEnd, preset).bind('beforeDrop', opt.beforeDrop, preset).bind('end', opt.end, preset)
             .bind('snap', opt.onSnap, preset).bind('snapRelease', opt.onSnapRelease, preset).bind('scroll', opt.onScroll, preset)
             .bind('enabled', opt.enabled, preset).bind('disabled', opt.disabled, preset);
        if (preset != 'default') this.resetVars();
    },

    resetVars: function() {
        this.helperSize= {w: 0, h: 0};
        this.timer = this.zIndex = this.opacity = this.click = this.cssPosition = this.mouseProp =
            this.startMouse = this.startPosition = this.startOffset = this.xdiff = this.ydiff =
            this.snapped = this.stack = this.placeholder = this.keyTimer = false;
        if (this.opt.renew || !this.envCached) this.scroll = this.sEdge = this.gridStart = this.snap = false;
        if (this.opt.renew || !this.dropCached) this.target = false;
        var th = this;
        if (this.snapped && this.opt.cls.snapTarget) $.each(this.snapped, function() {
            if (this.elem) this.elem.elem.removeClass(th.opt.cls.snapTarget);
        });
        this.curTarget = [];
        this.repairHelper = (!this.opt.helper || typeof this.opt.helper == 'object' || typeof this.opt.helper == 'string');
    },

    eventData: function(e, extend) {
        var d = {
            self: this.o,
            helper: this.moving,
            placeholder: this.placeholder,
            event: e,
            data: this.opt.data
        };
        return extend ? $.extend(d, extend) : d;
    },

    /* draggable methods
     *****************************************************************/

    createHelper: function(e) {
        var opt = this.opt, d = this.dynamic, m = false, p = false, o = this.o;

        this.opacity = o.css('opacity'); // initial opacity
        this.cssPosition = o.css('position'); // initial css position
        this.zIndex = o.css('z-index'); // initial zIndex
        if (opt.helper && this.checkKey('helper', e)) {
            switch (typeof opt.helper) {
                case 'boolean': {
                    if (opt.cls.helper) {
                        m =  $('<div class="dnmc-helper"></div>')
                            .css({position: d.cssPosition, width:o.width(), height: o.height()})
                            .addClass(opt.cls.helper);
                    } else {
                       m = o.clone();
                       $('.dnmc-resize, .dnmc-resize-wrapper', m).remove();
                    }
                    break;
                };
                case 'function': { m = $(opt.helper.call(opt.scope, o)); break; };
                case 'object': case 'string': { m = $(opt.helper); break; };
            }
            // it's better to keep helper inside of the original parent
            m.css('position', 'absolute')
                .appendTo( opt.helperAppendTo ? opt.helperAppendTo :
                                  this.dynamic.offsetIsRoot && 'static' != this.dynamic.cssPosition ? 'body' : this.dom.parentNode)
                .show();
            m.data('dynamic', new dynamic(m[0]));
            var md = m.data('dynamic');
            md.prepareGeneral();
            m.dnmcHelper = true;
            md.position = md.convertPosition(d.offset, 'relative');
            md.offset = md.convertPosition(md.position, 'absolute');
            md.update('position');
            if ($.browser.opera && /img/i.test(m[0].tagName)) { // opera fix. Preventing default image dragging
                m.bind('mousedown.dnmc',  function(e){ e.stopPropagation(); e.preventDefault(); return false;});
            }
            this.dynamic = m.data('dynamic');
        } else {
            m = o;
        }
        this.helperSize = {w: this.dynamic.size.width, h: this.dynamic.size.height};

        if (opt.placeholder && this.checkKey('placeholder', e)) {
            switch (typeof opt.placeholder) {
                case 'boolean': {
                    p = $('<div class="dnmc-placeholder"></div>');
                    break;
                }
                case 'function': { p = $(opt.placeholder.call(opt.scope, o)); break; }
                case 'object': case 'string': p = $(opt.placeholder);
            }

            p.css({position: this.cssPosition, width: o.width(), height: o.height()});
            if (opt.cls.placeholder) p.addClass(opt.cls.placeholder);
            if ('relative' == o.data('dynamic').cssPosition) p.css('position', 'absolute');
            p.insertBefore(o);
            p.data('dynamic', new dynamic(p[0]));
            var pd = p.data('dynamic');
            pd.prepare();
            pd.position = pd.convertPosition(d.offset, 'relative');
            pd.cssSize = pd.convertSize(d.size, 'inner');
            pd.update('both');
            p.show();
        }

        if (!opt.helper && 'static' == this.cssPosition) {
            m.css({position: 'absolute', left: d.offset.left-d.margin.left, top: d.offset.top-d.margin.top});
            d.cssPosition = 'absolute';
        }

        if (opt.opacity) m.css('opacity', opt.opacity);
        if (opt.zIndex&&!opt.stack) m.css('z-index', opt.zIndex);
        if (this.stack && this.stack.helperIndex) m.css('z-index', this.stack.helperIndex);
        if (opt.cls.drag) o.addClass(opt.cls.drag);
        m.show();
        if (m.dnmcHelper && p) o.hide();
        this.moving = m;
        this.placeholder = p;
    },

    removeHelper: function() {
        var opt = this.opt, d = this.dynamic, p = this.placeholder, m = this.moving;

        if (opt.cls.drag) this.o.removeClass(opt.cls.drag);
        if (this.repairHelper || !m.dnmcHelper) {
            if (opt.opacity) m.css('opacity', this.opacity);
            if (opt.zIndex&&!opt.stack) m.css('z-index', this.zIndex);
            if ('static' == this.cssPosition) {
                m.css({position:'static', left: '', top:''});
                d.cssPosition = 'static';
            }
        }
        if (opt.placeholder && p) {
            p[opt.destroyHelper?'remove':'hide']();
            this.placeholder = false;
        }
        if (opt.placeholder && opt.helper) this.o.show();
        if (m.dnmcHelper) {
            var d = this.dynamic = this.o.data('dynamic');
            d.prepareGeneral();
            d.position = d.convertPosition(m.data('dynamic').offset, 'relative');
            m[opt.destroyHelper?'remove':'hide']();
        }
        this.moving = this.o;
    },

    /* draggable methods, optional functionality
     *****************************************************************/

    initTargets: function() {
        var th = this, opt = this.opt;
        if (!opt.targetOptions) opt.targetOptions = {scope: this};
        if (opt.targetOptions.scope == undefined) opt.targetOptions.scope = this;
        var target = $(opt.target != true ? opt.target : '.dnmc-droppable');
        this.target = [];

        target.filter(function(){
            if (this == th.dom) return false;
            var o = $(this), drp = o.data('droppable');
            if (drp==undefined) {
                o.droppable(opt.targetOptions);
                drp = o.data('droppable');
            }
            if (opt.targetGroup && drp.opt.group != opt.targetGroup) return false;
            if (!drp.accept(th.o)) return false;
            o.data('dynamic').prepareGeneral().preparePosition();
            drp.activate(th.o);
            th.target.push(drp);
            return true;
        });
        if (this.target.length==0) this.target = false;
    },

    resetTargets: function() {
        for (var i = 0, len = this.target.length; i < len; i++) { this.target[i].deactivate(); }
        this.target = false;
        this.clearCurrentTargets();
    },

    clearCurrentTargets: function(doOut) {
        var cur = this.curTarget;
        for (var i = 0, len = cur.length; i < len; i++) {
            if (!cur[i]) continue;
            if (doOut) cur[i].out();
            cur[i].curDraggable = false;
        }
        cur = [];
    },

    initGrid: function() {
        var gridStart = this.opt.gridStart, opt = this.opt, d = this.dynamic;
        if (!gridStart) {
            gridStart = {
                x: (d.position.left>opt.grid.x) ? d.position.left%opt.grid.x : d.position.left,
                y: (d.position.top>opt.grid.y) ? d.position.top%opt.grid.y : d.position.top
           };
        } else {
            if (typeof gridStart != 'object' || gridStart.x == undefined) {
                gridStart = $(gridStart).offset();
                if (typeof gridStart != undefined) {
                    gridStart.x = gridStart.left; gridStart.y = gridStart.top;
                } else return opt.gridStart = opt.grid = false;
            }
        }
        if (opt.grid) d.setPositionGrid(opt.grid, gridStart);
    },

    initScrollArea: function() {
        var opt = this.opt, sEdge = {}, d = this.o.data('dynamic');
        if (!d.sParent) d.prepareGeneral();
        switch (typeof opt.scroll) {
            case 'boolean': {
                if (opt.container) this.scroll = opt.container;
                else this.scroll = d.sParent;
                break;
            }
            case 'object': case 'string': { this.scroll = $(opt.scroll); }
        }
        if (!this.scroll || this.scroll.length == 0) { this.scroll = false; return false;}
        var scroll = this.scroll;

        if ( (/body|html/i).test(scroll[0].tagName) || scroll[0] == document) {
            sEdge.allowEverywhere = true;
            if ('fixed' == this.dynamic.cssPosition) {
                sEdge.isTop = function(e) { return e.clientY < opt.scrollSensitivity; };
                sEdge.isBottom = function(e) { return $(window).height() - e.clientY < opt.scrollSensitivity;};
                sEdge.isLeft = function(e) { return e.clientX < opt.scrollSensitivity; };
                sEdge.isRight = function(e) { return $(window).width() - e.clientX < opt.scrollSensitivity; };
            } else {
                sEdge.isTop = function(e) { return e.pageY - $(document).scrollTop() < opt.scrollSensitivity;};
                sEdge.isBottom = function(e) {return $(window).height() - (e.pageY - $(document).scrollTop()) < opt.scrollSensitivity; };
                sEdge.isLeft = function(e) { return e.pageX - $(document).scrollLeft() < opt.scrollSensitivity; };
                sEdge.isRight = function(e) { return $(window).width() - (e.pageX - $(document).scrollLeft()) < opt.scrollSensitivity; };
            }
            sEdge.curScroll = function() { return {left: $(document).scrollLeft(), top: $(document).scrollTop()}; };
            sEdge.scrollDiff = function(prev) { return {x: $(document).scrollLeft()-prev.left, y: $(document).scrollTop()-prev.top };};
            sEdge.scrollY = function(e, d) { $(document).scrollTop( $(document).scrollTop() + opt.scrollStep*d );};
            sEdge.scrollX = function(e, d) { $(document).scrollLeft( $(document).scrollLeft() + opt.scrollStep*d );};
        } else {
            var scrollX = (/auto|scroll/i).test(scroll.css('overflow')) || (/auto|scroll/i).test(scroll.css('overflow-x'));
            var scrollY = (/auto|scroll/i).test(scroll.css('overflow')) || (/auto|scroll/i).test(scroll.css('overflow-y'));
            if (!scrollX && !scrollY) return false;
            sEdge.allowEverywhere = false;
            var ofs = scroll.offset();
            sEdge.x1 = ofs.left; sEdge.y1 = ofs.top;
            sEdge.x2 = ofs.left + scroll.outerWidth(); sEdge.y2 = ofs.top+scroll.outerHeight();
            sEdge.isTop = function(e) { return e.pageY - ofs.top < opt.scrollSensitivity;};
            sEdge.isBottom = function(e) { return (ofs.top + scroll[0].offsetHeight) - e.pageY < opt.scrollSensitivity;  };
            sEdge.isLeft = function(e) {return e.pageX - ofs.left < opt.scrollSensitivity;};
            sEdge.isRight = function(e) {return (ofs.left + scroll[0].offsetWidth) - e.pageX < opt.scrollSensitivity; };
            sEdge.curScroll = function() { return {left: scroll[0].scrollLeft, top: scroll[0].scrollTop}; };
            sEdge.scrollDiff = function(prev) { return {x: scroll[0].scrollLeft-prev.left, y: scroll[0].scrollTop-prev.top };};
            sEdge.scrollY = function(e, d) { scroll[0].scrollTop += opt.scrollStep*d; };
            sEdge.scrollX = function(e, d) { scroll[0].scrollLeft += opt.scrollStep*d; };
        }
        this.sEdge = sEdge;
    },

    clearScrollArea: function() { this.sEdge = this.scroll = false; },

    initFocusElement: function() {
        var th = this;
        this.focus = $('<a href="#" class="dnmc-focus"></a>').css({position:'absolute',  tabIndex: '-1'})
            .bind('click.dnmc', function(e){e.stopPropagation(); return false;})
            .bind('keydown.dnmc', function(e){ return th.doKeyboardNav.call(th, e); })
            .bind('keyup.dnmc', function(e){ return th.cancelKeyboardNav.call(th, e); })
            .bind('blur.dnmc', function(e){ return th.onBlur.call(th); })
            .appendTo('body');
        this.opt.handle.bind('click.dnmc', function(e) { return th.onFocus.call(th,e); });
        if (this.opt.keyboardOnly && this.opt.grid) this.initGrid();
    },

    removeFocusElement: function() { this.focus.unbind().remove(); this.opt.handle.unbind('click.dnmc'); this.focus=false; },


    /* draggable methods, checks
     *****************************************************************/

    checkTargets: function(e) {
        this.dynamic.rectCache=false;
        var trg = this.target, d = this.dynamic;
        for (var i = 0, len = trg.length; i < len; i++) {
            if ('pointer' == trg[i].opt.tolerance && trg[i].dynamic.underPointer(e)) this.addTarget(trg[i], e);
            else if ('pointer' != trg[i].opt.tolerance && d.intersect(trg[i].dynamic.rect(), trg[i].opt.tolerance)) this.addTarget(trg[i], e);
            else if (trg[i].curDraggable && trg[i].curDraggable.dom == this.dom) this.removeTarget(trg[i], e);
        }
    },

    allowedToScroll: function(e) {
        return (this.opt.scrollOutside||this.sEdge.allowEverywhere) ? true :
            (e.pageX > this.sEdge.x1 && e.pageX < this.sEdge.x2 && e.pageY > this.sEdge.y1 && e.pageY < this.sEdge.y2);
    },

    /* draggable methods, do's
     *****************************************************************/

    addTarget: function(trg, e) {
        if (trg.curDraggable.dom == this.dom) return;
        if (trg.opt.greedy) this.clearCurrentTargets(true);
        trg.curDraggable = this;
        trg.over(this.eventData(e));
        this.curTarget.push(trg);
    },

    removeTarget: function(trg, e) {
        var cur = this.curTarget, empty = true, removed = false;
        if (!cur.length) return;
        for (var i = 0, len = cur.length; i < len; i++) {
            if (!removed && cur[i] && cur[i].dom == trg.dom) {
                cur[i].out(this.eventData(e));
                cur[i] = null;
                removed = true;
            }
            if (cur[i] != null) empty = false;
        }
        if (empty) cur = [];
        trg.curDraggable = false;
    },

    doDrop: function(e) {
        var trg = this.curTarget;
        if (!trg.length) return false;
        for (var i=0, len = trg.length; i < len; i++) {
            if (trg[i]) {
                trg[i].drop(this.eventData(e));
                this.trigger('drop', this.eventData(e, {droppable: trg[i].o}));
            }
        }
    },

    doSnap: function(side, outer, obj, e) {
        var opSides = {l: 'r', t: 'b', r: 'l', b: 't'}, snpd = this.snapped || {},
              dnmc = obj.dnmc, opt = this.opt, d = this.dynamic;
        if (typeof obj.s != 'object') obj.s = {};
        if (typeof snpd[side] == 'object' || typeof snpd[opSides[side]] == 'object') return true;
        obj.s[side]=true;
        snpd[side]={mx: e.pageX, my: e.pageY, elem: obj, mode: (outer?'outer':'inner')};
        if (side=='b') d.offset.top = (outer ? dnmc.offset.top : dnmc.offset.top + dnmc.size.height)-this.helperSize.h;
        if (side=='l') d.offset.left = (outer ? dnmc.offset.left+dnmc.size.width : dnmc.offset.left);
        if (side=='t') d.offset.top = (outer ? dnmc.offset.top+dnmc.size.height : dnmc.offset.top);
        if (side=='r') d.offset.left = (outer ? dnmc.offset.left : dnmc.offset.left+dnmc.size.width)-this.helperSize.w;
        this.trigger('snap', this.eventData(e, {target: obj.elem, side: side}));
        if (opt.cls.snapped) this.moving.addClass(opt.cls.snapped);
        if (opt.cls.snapTarget) obj.elem.addClass(opt.cls.snapTarget);
        this.snapped = snpd;
        return true;
    },

    doKeyboardNav: function(e) {
        if ($.inArray(e.keyCode, [37,38,39,40])==-1) return false;
        if (!this.checkKey('keyboard', e)) return false;
        if ((e.keyCode==38||e.keyCode==40)&&this.opt.axis=='x') return false;
        if ((e.keyCode==37||e.keyCode==39)&&this.opt.axis=='y') return false;
        if (this.opt.grid) {
            if (e.keyCode==38||e.keyCode==40) this.opt.keyStep = this.opt.grid.y;
            if (e.keyCode==37||e.keyCode==39) this.opt.keyStep = this.opt.grid.x;
        }
        if (!this.keyTimer) { var th = this; this.keyTimer = window.setTimeout(function(){ th.doKeyboardNav.call(th, e); }, this.opt.keyTime); }
        this.dynamic.offset[(e.keyCode==38||e.keyCode==40 ? 'top':'left')] += this.opt.keyStep*(e.keyCode==39||e.keyCode==40?1:-1);
        this.dynamic.preparePosition().update('position');
        this.trigger('drag', this.eventData(e));
        return false;
    },

    cancelKeyboardNav: function() {
        if (!this.keyTimer) return false;
        window.clearTimeout(this.keyTimer);
        this.keyTimer=false;
    },

    doScroll: function(e) {
        if (!this.allowedToScroll(e)) return false;
        var edge = this.sEdge;
        var prev = edge.curScroll.call(this);
        if (edge.isTop.call(this, e)) edge.scrollY.call(this, e, -1);
        if (edge.isBottom.call(this, e)) edge.scrollY.call(this, e, 1);
        if (edge.isLeft.call(this, e)) edge.scrollX.call(this, e, -1);
        if (edge.isRight.call(this, e)) edge.scrollX.call(this, e, 1);
        var diff = edge.scrollDiff.call(this, prev);
        if (diff.x != 0 || diff.y != 0) this.trigger('scroll', this.eventData(e, {diff: diff}));
    },

    doStack: function() {
        var th = this;
        this.stack = $.makeArray($(this.opt.stack!==true?this.opt.stack : '.dnmc-draggable')).sort(function(a,b) {
            return (parseInt($(a).css("zIndex"))||th.opt.zIndex) - (parseInt($(b).css("zIndex")) || th.opt.zIndex);
        });
        $(this.stack).each(function(i) { this.style.zIndex = th.opt.zIndex + i; });
        this.o[0].style.zIndex = this.opt.zIndex + this.stack.length;
        this.stack.helperIndex = this.o[0].style.zIndex+1;
    },

    toggleHidden: function(mode) {
        $(this.opt.hide).not(this.dom).css('visibility', mode?'hidden':'visible');
    },

    /* draggable methods, events handling
     *****************************************************************/

    onFocus: function(e) {
        if (!this.focus) return false;
        this.focus.css({left: $(document).scrollLeft(), top: $(document).scrollTop()});
        this.dynamic.prepareAbsolute().preparePosition();
        this.focus[0].focus();
        if (this.opt.cls.focus) this.moving.addClass(this.opt.cls.focus);
        return false;
    },

    onBlur: function() { if (this.opt.cls.focus) this.moving.removeClass(this.opt.cls.focus); },

    mouseDown: function(e) {
        if (!this.checkKey('drag', e)) return false;
        e.preventDefault();
        e.stopPropagation();
        if (this.trigger('beforeStart', this.eventData(e))===false) return false;
        this.mouseDelay(e, this.moveStart, this);
        return false;
    },

    moveStart: function(e) {
        var opt = this.opt, d = this.dynamic, th = this, pc = this.preClick;

        d.prepare();
        this.startMouse = {x: e.pageX, y: e.pageY};
        this.startPosition = {left: d.position.left, top: d.position.top};
        this.startOffset = {left: d.offset.left, top: d.offset.top};

        this.click = pc ?
            { x: pc.x-d.offset.left, y: pc.y-d.offset.top } :
            { x: e.pageX-d.offset.left, y: e.pageY-d.offset.top };
        this.preClick=false;

        this.createHelper(e);

        if (opt.cursorAt) {
            if (opt.cursorAt.left != undefined) this.click.x = -opt.cursorAt.left;
            if (opt.cursorAt.top != undefined) this.click.y = -opt.cursorAt.top;
            if (opt.cursorAt.right != undefined) this.click.x = d.size.width+opt.cursorAt.right;
            if (opt.cursorAt.bottom != undefined) this.click.y = d.size.height+opt.cursorAt.bottom;
        }
        if (opt.preserveCursor) {
            this.bodyCursor = $('body').css('cursor');
            $('body').css('cursor', this.o.css('cursor'))
        }

        if (opt.renew||!this.snapCached) {
            if (opt.snap) this.initSnap([this.dom, this.moving[0], this.placeholder?this.placeholder[0]:false], '.dnmc-draggable');
            else this.clearSnap();
            this.snapCached=true;
        }
        if (opt.renew||!this.envCached) {
            if (opt.container) d.setBounds(this.getBoundsFromContainer());
            if (opt.bound) d.setBounds(opt.bound);
            if (!opt.container && !opt.bound) d.clearBounds();
            if (opt.scroll) this.initScrollArea();
            else this.clearScrollArea();
            if (opt.grid) this.initGrid();
            else d.clearPositionGrid();
            this.envCached=true;
        }
        if (opt.target) this.initTargets();
        if (opt.stack) this.doStack();
        if (opt.iframeFix) this.createIframeFix();
        if (opt.hide) this.toggleHidden(true);
        if (opt.withKey && opt.withKey.grid) d.checkPositionGrid = this.checkKey('grid',e);

        $(this.dom.ownerDocument).bind('mousemove.dnmc',function(e) {return th.mouseMove.call(th, e);});
        $(this.dom.ownerDocument).bind('mouseup.dnmc',function(e) {return th.mouseUp.call(th, e);});
        this.trigger('start', this.eventData(e));

        if (e) this.mouseMove(e);
        return false;
    },

    mouseMove: function(e) {
        var opt = this.opt, d = this.dynamic, snpd = this.snapped;
        if (opt.axis != 'y' && opt.axis != 'none' && !snpd['l'] && !snpd['r']) d.offset.left = e.pageX-this.click.x;
        if (opt.axis != 'x' && opt.axis != 'none' && !snpd['t'] && !snpd['b']) d.offset.top = e.pageY-this.click.y;
        if (this.scroll) this.doScroll(e);
        if (this.snap) this.checkSnap(e);
        if (this.snapped) this.unSnap(e);
        if (this.target && this.checkKey('drop',e)) this.checkTargets(e);
        d.preparePosition().update('position');
        if (this.trigger('drag', this.eventData(e))===false) return this.mouseUp(e);
        return true;
    },

    mouseUp: function(e) {
        if (this.trigger('beforeEnd', this.eventData(e))===false) return false;
        var opt = this.opt, d = this.dynamic, th = this, trg = this.curTarget,
              m = this.moving, p = this.placeholder;

        $(this.dom.ownerDocument).unbind('.dnmc');
        if (trg.length>0 && this.checkKey('drop',e)) {
            for (var i = 0, len = trg.length; i < len; i++) {
                if (trg[i]) this.trigger('beforeDrop', this.eventData(e, {droppable: trg[i].o}));
            }
            // here we need to keep current offset, but change all relative parameters and recalculate position
            this.o.data('dynamic').afterDOMPositionChange();
        }
        if (opt.animate && this.checkKey('animate',e)) {
            if (opt.restore && this.checkKey('restore',e)) {
                d.position = d.convertPosition(this.startOffset, 'relative');
                return d.update('position', opt.animate, opt.easing, function() { th.moveEnd(e); });
            } else if (opt.helper && 'static' != this.cssPosition && m.dnmcHelper) {
                var md = m.data('dynamic'), temp = m, d = this.dynamic = this.o.data('dynamic');
                if (p) this.o.show();
                d.prepareGeneral();
                if (p) {
                    var pd = p.data('dynamic');
                    pd.prepareAbsolute();
                    d.position = d.convertPosition(pd.offset, 'relative');
                    d.update('position');
                }
                d.position = d.convertPosition(md.offset, 'relative');
                this.moving = this.o;
                return this.dynamic.update('position', opt.animate, opt.easing, function() { th.moving = temp; th.moveEnd(e); });
            } else {
                return this.moveEnd(e);
            }
        }
        else if (!opt.animate && opt.restore && this.checkKey('restore',e)) {
            d.position = d.convertPosition(this.startOffset, 'relative');
            d.update('position');
            return this.moveEnd(e);
        }
        else if (!opt.restore && !opt.animate && opt.helper) {
            this.removeHelper();
            this.dynamic.update('position');
            return this.moveEnd(e);
        }
        return this.moveEnd(e);
    },

    moveEnd: function(e) {
        var opt = this.opt;
        this.removeHelper();
        if (this.bodyCursor) {
            $('body').css('cursor', this.bodyCursor);
            this.bodyCursor = false;
        }
        if (opt.iframeFix) this.removeIframeFix();
        if (opt.hide) this.toggleHidden(false);
        if (this.curTarget && this.checkKey('drop',e)) this.doDrop(e);
        if (this.target) this.resetTargets();
        this.trigger('end', this.eventData(e));
        this.resetVars();
        if (opt.cls.snapped) this.o.removeClass(opt.cls.snapped);
        return false;
    }
});

/* Resizable
 *****************************************************************/

var resizable = function(dom) {
    this.dom = dom;
    var o = this.o = $(dom);
    this.wrapper = this.o;
    this.events = {};
    var d = o.data('dynamic');
    if (d == undefined) {
        o.data('dynamic', new dynamic(dom));
        d = o.data('dynamic');
    }
    this.dynamic = d;
    this.enabled = this.inProcess =
        this.n = this.ne = this.e = this.se = this.s = this.sw = this.w = this.nw =
        this.handlesInitialized = this.localEvents = this.wrapperMode = false;
    this.opt = {
        handles: 'e,se,s', cls: {}, axis: false, delay: false, distance: false, outside: 0, snapTolerance: 20, snapMode: 'both',
        hide: false, min: 10, max: false, ratio: false, animate: false, easing: false, renew: true,
        helper: false, grid: false, snap: false, restore: false, iframeFix: false, container: false, bound: false,
        scope: false, wheel: false, clickndrag: false, opacity: false, scroll: false, scrollStep: 20, scrollSensitivity: 20,
        data: null, cancel: ':input', unselectable: false, withKey: false, size: 5, wrapper: false,
        nw: false, n: false, ne: false, e: false, se: false, s: false, sw: false, w: false
    };
    this.eventNamespace = 'resizable';
    this.resetVars();
};

$.extend(resizable.prototype, observable, dnrCommon, {

    toggle: function(mode) {
        if (mode=='enable'||mode===true) return this.setEvents('on');
        if (mode=='disable'||mode===false) return this.setEvents('off');
    },

    setEvents: function(mode) {
        var opt = this.opt, o = this.o, th = this;

        if (mode=='on' && !this.enabled) {
            this.dynamic.prepareAbsolute();
            if ('static'==this.dynamic.cssPosition && !windowLoaded) { // there are too many situations when it's needed, so i decided to do it in all situations
                var th = this;
                $(window).bind('load', function() { th.createResizeHandles(); });
            }
            else this.createResizeHandles();

            if (opt.wheel) {
                o.bind('mouseenter.dnmcresize', function() {
                    $('body').bind('mousewheel.dnmcresize', function(e, delta) { return th.onWheel(e, delta); });
                    $(th.opt.cancel, o).bind('mousewheel.dnmcresize', function(e) { e.stopPropagation(); return true;});
                    return false;
                });
                o.bind('mouseleave.dnmcresize', function() {
                    $('body').unbind('mousewheel.dnmcresize');
                    return true;
                });
            }
            if (opt.clickndrag) {
                o.bind('mousedown.dnmcresize', function(e) { return th.onMouseDown(e); });
                $(opt.cancel, o).bind('mousedown.dnmcresize', function(e) { e.stopPropagation(); return true;});
            }
            if (opt.unselectable) this.dynamic.disableSelection();
            if ($.browser.safari && /textarea/i.test(this.dom.tagName)) o.css('resize', 'none');
            this.enabled = true;
            o.addClass('dnmc-resizable');
            if (opt.cls.active) o.addClass(opt.cls.active);
            this.trigger('enabled', this.eventData());
        }
        if (mode=='off' && this.enabled) {
            this.removeResizeHandles();
            if (opt.wheel) {
                o.unbind('mouseenter.dnmcresize').unbind('mouseleave.dnmcresize');
                $(opt.cancel, o).unbind('mousewheel.dnmcresize');
            }
            if (opt.clickndrag) {
                o.unbind('mousedown.dnmcresize');
                $(opt.cancel, o).unbind('mousedown.dnmcresize');
            }
            if (opt.unselectable) this.dynamic.enableSelection();
            this.enabled = false;
            o.removeClass('dnmc-resizable');
            if (opt.cls.active) o.removeClass(opt.cls.active);
            this.trigger('disabled', this.eventData());
        }
        return this;
    },

    eventData: function(e, extend) {
        var d = {
            self: this.o,
            helper: this.helper,
            size: this.dynamic.size,
            cssSize: this.dynamic.cssSize,
            data: this.opt.data,
            event: e
        };
        return extend ? $.extend(d, extend) : d;
    },

    correctRatio: function() {
        // min and max constraints have priority. We can't allow element to have proportions larger than max.
        // So we decrease max according to ratio.
        var opt = this.opt;

        if (opt.ratio === true) opt.ratio = this.o.width()/this.o.height();
        if (opt.ratio && opt.max) {
            var constRatio = opt.max.w/opt.max.h;
            if ((opt.ratio > 1 && constRatio > 1)||(opt.ratio <= 1 && constRatio <=1))
                opt.max.w = Math.round(opt.max.h * opt.ratio);
            else  opt.max.h = Math.round(opt.max.w / opt.ratio);
        }
        if (opt.ratio && opt.min) {
            var constRatio = opt.min.w/opt.min.h;
            if ((opt.ratio > 1 && constRatio > 1)||(opt.ratio <= 1 && constRatio <=1))
                opt.min.h = Math.round(opt.min.w / opt.ratio);
            else opt.min.w = Math.round(opt.min.h * opt.ratio);
        }
    },

    setOptions: function(options, preset) {
        var cls = false, opt = this.opt;
        if (opt && opt.cls && options && options.cls) cls=$.extend({}, opt.cls, options.cls);
        if (!preset) preset = 'default';
        $.extend(opt, options);
        if (cls) opt.cls = cls;
        if (!opt.scope || opt.scope == 'dom') opt.scope = this.dom;
        if (opt.scope == 'dnmc') opt.scope = this;
        if (!opt.min) opt.min = {
            w: parseInt(this.o.css('min-width'), 10) || 10, h: parseInt(this.o.css('min-height'), 10) || 10
        };
        if (!opt.max) opt.max = {
            w: parseInt(this.o.css('max-width'), 10) || false, h: parseInt(this.o.css('max-height'), 10) || false
        };
        if (!opt.max.w && !opt.max.h) opt.max=false;
        if (opt.min && typeof opt.min != 'object') opt.min = {w: opt.min, h: opt.min};
        if (opt.max && typeof opt.max != 'object') opt.max = {w: opt.max, h: opt.max};
        if (opt.grid && typeof opt.grid !='object') opt.grid = {x: opt.grid, y: opt.grid};
        if ($.browser.safari && !windowLoaded) {
            var th= this;
            $(window).bind('load', function(){ th.correctRatio(); }); // document.ready isn't suitable for this situation :(
        } else this.correctRatio();
        this.bind('beforeStart', opt.beforeStart, preset).bind('start', opt.start, preset).bind('sizeChange', opt.sizeChange, preset)
             .bind('beforeEnd', opt.beforeEnd, preset).bind('end', opt.end, preset).bind('snap', opt.onSnap, preset)
             .bind('snapRelease', opt.onSnapRelease, preset).bind('enabled', opt.enabled, preset)
             .bind('disabled', opt.disabled, preset).bind('scroll', opt.onScroll, preset);
        if (preset != 'default') this.resetVars();
    },

    resetVars: function() {
        this.helper = this.startSize = this.startPosition = this.cssPosition = this.timer = this.opacity =
            this.startOffset = this.startHandleOffset = this.startMouse =
            this.snapped = this.wtimer = this.wdelta = false;
        this.wstrength = 5;
        if (this.opt.renew || !this.snapCached) this.snap = false;
    },

    createHelper: function(handle, e) {
        if (!this.checkKey('helper', e)) return false;
        var d = this.dynamic, opt = this.opt, h = false;
        if (opt.cls.helper) {
            h =  $('<div class="dnmc-resize-helper"></div>').addClass(opt.cls.helper);
            if (opt.opacity) h.css('opacity', opt.opacity);
        } else {
            h = this.o.clone();
            $('*', h).remove();
            if (opt.cls.ghost) h.addClass(opt.cls.ghost);
            h.css('opacity', opt.opacity!==false?opt.opacity:0.7);
        }
        h.appendTo(d.offsetIsRoot ? 'body' : this.dom.parentNode);
        if ($.browser.safari) d.show();
        h.css({position: 'absolute', zIndex: 1000, width: d.size.width, height: d.size.height});
        if (handle) h.css({cursor: handle+'-resize'});
        h.data('dynamic', new dynamic(h[0]));
        var hd = h.data('dynamic');
        hd.prepare();
        h.dnmcHelper = true;
        hd.position = hd.convertPosition(d.offset, 'relative');
        hd.cssSize = hd.convertSize(d.size, 'inner');
        hd.update('both').prepareAbsolute();
        this.helper = h;
        this.dynamic = hd;
    },

    removeHelper: function() {
        if (!this.helper) return true;
        var d = this.dynamic = this.o.data('dynamic'), hd = this.helper.data('dynamic');
        hd.prepareAbsolute();
        d.prepare();
        d.position = d.convertPosition(hd.offset, 'relative');
        d.cssSize = d.convertSize(hd.size, 'inner');
        this.helper.remove();
    },

    createResizeHandles: function() {
        var h = this.opt.handles.split(',');
        if ($.inArray('none', h)!=-1) return false;
        if ($.inArray('all', h)!=-1) h = allHandles;
        if (h.length==0) return false;
        var overflow = this.o.css('overflow')+this.o.css('overflow-x')+this.o.css('overflow-y');
        if (/img|input|select|textarea|button|object|iframe|table|a|canvas/i.test(this.dom.tagName))
            this.createWrapper(/static|relative/i.test(this.dynamic.cssPosition)?3:1);
        else if (/auto|scroll/i.test(overflow) || (/hidden/i.test(overflow) && this.opt.outside > 0))
            this.createWrapper(1);
        else if (this.opt.wrapper || 'static' == this.dynamic.cssPosition)
            this.createWrapper(2);
        var i = h.length;
        while (i--, i>=0) this.createResizeHandle(h[i]);
        var th = this;
        if (this.opt.hide) {
            this.o.bind('mouseenter.dnmc', function() { th.toggleHandles('on'); })
                    .bind('mouseleave.dnmc', function() { if (!th.inProcess) th.toggleHandles('off'); });
        } else {
            this.toggleHandles('on');
        }
        if (this.wrapperMode && this.wrapperMode!=2) { // relative wrapper after resizable
            this.o.bind('start.draggable.__rszbl', function() { th.toggleHandles('off'); });
            this.o.bind('end.draggable.__rszbl', function() {
                th.wrapper.insertAfter(th.o);
                th.toggleHandles('on');
            });
        }
        if ('relative' == this.dynamic.cssPosition && $.browser.msie) $(window).one('load', function(){ th.updateHandles(); });
    },

    createWrapper: function(mode) {
        // mode: 1 - absolute wrapper after element, 2 - relative inside wrapper,
        // 3 - relative wrapper after element, 0 - no wrapper, handles are inside of the element
        var wrapper = $('<div class=dnmc-resize-wrapper></div>')
            .css({padding:'0px',margin:'0px',border:'0px', width: '0px', height: '0px', left: '0px', top: '0px',
                    background: 'transparent', zIndex: '',
                    overflow: 'visible', overflowX: 'visible', overflowY: 'visible'});
        if (mode==1) {
            wrapper.css('position',  this.dynamic.cssPosition != 'fixed' ? 'absolute' : 'fixed').insertAfter(this.o);
        }
        if (mode==2) {
            wrapper.css('position', 'relative');
            this.o.prepend(wrapper);
        }
        if (mode==3) {
            wrapper.css('position', 'relative').insertAfter(this.o);
        }
        wrapper.data('dynamic',  new dynamic(wrapper[0]));
        this.wrapperMode = mode;
        this.wrapper = wrapper;
    },

    updateHandles: function(initial) {
        var d = this.dynamic, i = 8, wd = this.wrapperMode ? this.wrapper.data('dynamic') : false, opt = this.opt;
        d.prepareSizeRelated().prepareAbsolute();
        var oSize = {
            width: d.size.width - ('static'==d.cssPosition ? 0 : d.sizeRelated.bl) - d.sizeRelated.br,
            height: d.size.height - ('static'==d.cssPosition ? 0 : d.sizeRelated.bt) - d.sizeRelated.bb
        };

        if (wd) {
            wd.prepareGeneral();
            wd.position = wd.convertPosition(d.offset, 'relative');
            wd.update('position');
        }

        while(i--, i>=0) {
            var pos = allHandles[i];
            if (!this[pos]) continue;
            var drg = this[pos].data('dynamic');
            if (this[pos][0].customHandle) { drg.prepareAbsolute(); continue; };
            if (initial) {
                var w = this[pos].width();
                var h = this[pos].height();
                if (h<=1 && (pos=='w'||pos=='e')) this[pos].autoSize = true;
                if (w<=1 && (pos=='n'||pos=='s')) this[pos].autoSize = true;
                if (w<=1) {
                    drg.o[0].style.width = drg.o[0].style.height = opt.size+'px';
                }
                drg.prepareAbsolute().prepareSizeRelated();
            }
            var size = false;

            if(pos=='ne') { var position = {left: oSize.width - drg.size.width, top: 0};  }
            if(pos== 'se') { var position = {left: oSize.width - drg.size.width, top: oSize.height - drg.size.height};  }
            if(pos== 'nw') { var position = {left: 0, top: 0}; }
            if(pos== 'sw') { var position = {left:0, top: oSize.height - drg.size.height}; }

            // some say that 'if' is faster than 'switch'. Lets find this out.
            if(pos== 'n' || pos== 's') {
                var position = {left: 0, top: pos=='n' ? 0: oSize.height-drg.size.height};
                if (this[pos].autoSize) {
                    if (this[pos+'w']||this[pos+'e']) {
                        if (this[pos+'w']) position.left = this[pos+'w'].data('dynamic').size.width;
                        if (this[pos+'e'])
                                size = drg.convertSize(
                                    {width: oSize.width-this[pos+'e'].data('dynamic').size.width-position.left,
                                     height:drg.size.height}, 'inner');
                        else size = drg.convertSize({width: oSize.width-position.left, height:drg.size.height}, 'inner');
                    } else size = drg.convertSize({width: oSize.width, height:drg.size.height}, 'inner');
                    if (size.width<1) size.width=1;
                }
                else position.left = Math.round(oSize.width/2 - drg.size.width/2);
            }

            if(pos=='w' || pos=='e') {
                var position = {left: pos=='w' ? 0: oSize.width-drg.size.width, top: 0};
                if (this[pos].autoSize) {
                    if (this['n'+pos]||this['s'+pos]) {
                        if (this['n'+pos]) position.top = this['n'+pos].data('dynamic').size.height;
                        if (this['s'+pos])
                                size = drg.convertSize(
                                    {height: oSize.height-this['s'+pos].data('dynamic').size.height-position.top,
                                     width:drg.size.width}, 'inner');
                        else size = drg.convertSize({height: oSize.height-position.top, width:drg.size.width}, 'inner');
                    } else size = drg.convertSize({height: oSize.height, width:drg.size.width}, 'inner');
                    if (size.height<1) size.height=1;
                }
                else position.top = Math.round(oSize.height/2 - drg.size.height/2);
            }

            var outside = opt.outside;
            if (outside) {
                if (pos!='n'&&pos!='s') position.left += outside * (/w/.test(pos) ? -1 : 1);
                else {
                    if (this[pos+'w']) size.width += outside;
                    if (this[pos+'e']) size.width += outside;
                    if (this[pos+'w']) position.left -= outside;
                 }
                if (pos!='w'&&pos!='e') position.top += outside * (/n/.test(pos) ? -1 : 1);
                else {
                    if (this['n'+pos]) size.height += outside;
                    if (this['s'+pos]) size.height += outside;
                    if (this['n'+pos]) position.top -= outside;
                }
            }

            drg.position = {left: position.left, top: position.top};
            if (size) drg.cssSize = {width: size.width, height: size.height};
            drg.update('both');
        }
    },

    toggleHandles: function(mode) {
        $('.dnmc-resize', this.wrapper)[mode=='on'?'show':'hide']();
        if (this.wrapperMode) this.wrapper[mode=='on'?'show':'hide']();
        if (mode=='on') this.updateHandles( !this.handlesInitialized );
    },

    removeResizeHandles: function() {
        $('.dnmc-resize', this.o).each(function() {
            if (this.customHandle) return true;
            $(this).remove();
        });
        this.n = this.ne = this.e = this.se = this.s = this.sw = this.w = this.nw=false;
        if (this.wrapperMode) {
            this.wrapper.remove();
            this.o.unbind('.__rszbl');
        }
        this.wrapperMode=false;
        if (this.opt.hide) this.o.unbind('mouseenter.dnmc').unbind('mouseleave.dnmc');
        this.o.unbind('end.draggable.__resizable');
    },

    createResizeHandle: function(handle) {
        if ('static'==this.o.css('position') && !/td/i.test(this.dom.tagName) && /w|n/.test(handle)) return false;
        var opt = this.opt, h = false;
        if (opt.axis) {
            if ( /e|w/.test(handle) && opt.axis=='y') return false;
            if ( /n|s/.test(handle) && opt.axis=='x') return false;
        }
        var zIndex = parseInt(this.wrapper.css('z-index'),10)||0;
        if (opt[handle]) {
            if (typeof opt[handle] == 'object') h = $(opt[handle]);
            else h = $(opt[handle], this.o);
            if (h.length==0) h=false;
            else h[0].customHandle = true;
        }
        if (!h) {
            h = $('<div></div>').css({position: 'absolute', zIndex: '', cursor: handle+'-resize', overflow: 'hidden'});
            h.css({width:0, height:0});
            this.wrapper.append(h);
        }
        h.addClass('dnmc-resize').addClass('dnmc-resize-'+handle);
        h.show();
        if (opt.cls.handle) h.addClass(opt.cls.handle); // common class
        if (opt.cls[handle]) h.addClass(opt.cls[handle]); // specific class
        var axis = handle=='n'||handle=='s' ? 'y' : (handle=='w'||handle=='e'? 'x' : false);
        var cls = false;
        if (opt.cls.handleHelper) cls = {helper: opt.cls.handleHelper};
        if (opt.cls[handle+'Helper']) cls = {helper: opt.cls[handle+'Helper']};
        h.draggable({
            axis: axis, zIndex: zIndex,
            renew: opt.renew,
            delay: opt.delay, distance: opt.distance,
            data: handle, scope: this, snap: false, restore: opt.restore,
            target: false, cls: cls, destroyHelper: true, preserveCursor: true
        });
        h.data('draggable')
            .localBind({
                beforeStart: this.onBeforeStart,
                start: this.onDragStart,
                drag: this.onDragResize,
                end: this.onBeforeEnd,
                scroll: this.onScroll}, this)
            .localEvents = true;
        this[handle]=h;
    },

    doSnap: function(side, outer, obj, e) {
        var opSides = {l: 'r', t: 'b', r: 'l', b: 't'}, d = this.dynamic, opt = this.opt, od = obj.dnmc;
        if (typeof obj.s != 'object') obj.s = {};
        if (typeof this.snapped != 'object') this.snapped = {};
        if (typeof this.snapped[side] == 'object' || typeof this.snapped[opSides[side]] == 'object') return true;
        obj.s[side]=true;
        this.snapped[side]={mx: e.pageX, my: e.pageY, elem: obj, mode: (outer?'outer':'inner')};
        d.prepareAbsolute();
        if (side=='l') {
            var left = outer ? od.offset.left+od.size.width : od.offset.left;
            d.size.width += d.offset.left - left;
            d.offset.left = left;
        }
        if (side=='t') {
            var top = outer ? od.offset.top+od.size.height : od.offset.top;
            d.size.height += d.offset.top - top;
            d.offset.top = top;
        }
        if (side=='b') {
            d.size.height = outer ? od.offset.top-d.offset.top : od.offset.top+od.size.height - d.offset.top;
        }
        if (side=='r') {
            d.size.width = outer ? od.offset.left - d.offset.left : od.offset.left + od.size.width- d.offset.left;
        }
        d.position = d.convertPosition(d.offset, 'relative');
        d.cssSize = d.convertSize(d.size, 'inner');
        this.trigger('snap', this.eventData(e, {target: obj.elem, side: side}));
        if (opt.cls.snapped) this.moving.addClass(opt.cls.snapped);
        if (opt.cls.snapTarget) obj.addClass(opt.cls.snapTarget);
        return true;
    },

    setBounds: function(handle) { // modify draggable bound according to the min and max size
        var b = this[handle].data('draggable').opt.bound, opt = this.opt, sub = {}, rect = this.dynamic.rect();
        if (!b) b = {};
        if (/w|n/.test(handle)) {
            if (opt.max && /n/.test(handle)) sub.y1 = rect.y2-opt.max.h;
            if (opt.min && /n/.test(handle)) sub.y2 = rect.y2-opt.min.h;
            if (opt.max && /w/.test(handle)) sub.x1 = rect.x2-opt.max.w;
            if (opt.min && /w/.test(handle)) sub.x2 = rect.x2-opt.min.w;
        }
        if (/s|e/.test(handle)) {
            if (opt.max && /s/.test(handle)) sub.y2 = rect.y1+opt.max.h;
            if (opt.min && /s/.test(handle)) sub.y1 = rect.y1+opt.min.h;
            if (opt.max && /e/.test(handle)) sub.x2 = rect.x1+opt.max.w;
            if (opt.min && /e/.test(handle)) sub.x1 = rect.x1+opt.min.w;
        }
        if (sub.x1 && (!b.x1 || b.x1 < sub.x1)) b.x1=sub.x1;
        if (sub.x2 && (!b.x2 || b.x2 > sub.x2)) b.x2=sub.x2;
        if (sub.y1 && (!b.y1 || b.y1 < sub.y1)) b.y1=sub.y1;
        if (sub.y2 && (!b.y2 || b.y2 > sub.y2)) b.y2=sub.y2;
        this[handle].data('dynamic').setBounds(b);
    },

    correctHandleBound: function(handle, bound) {
        var rect = this.dynamic.rect();
        var hRect = this[handle].data('dynamic').rect();
        if (/e/.test(handle) && bound.x2 != undefined && !$.isFunction(bound.x2)) bound.x2 -= rect.x2-hRect.x2;
        if (/n/.test(handle) && bound.y1 != undefined && !$.isFunction(bound.y1)) bound.y1 += hRect.y1-rect.y1;
        if (/w/.test(handle) && bound.x1 != undefined && !$.isFunction(bound.x1)) bound.x1 += hRect.x1-rect.x1;
        if (/s/.test(handle) && bound.y2 != undefined && !$.isFunction(bound.y2)) bound.y2 -= rect.y2-hRect.y2;
        return bound;
    },

    onScroll: function(eData) {
        var diff = eData.diff, handle = eData.data, e = eData.event, d = this.dynamic;
        if (d.scrollIsRoot) return true;
        if ('fixed' != d.cssPosition) {
            if (/n/.test(handle)) { this.startSize.h -= diff.y; d.offset.top += diff.y; }
            if (/s/.test(handle)) { this.startSize.h += diff.y; d.offset.top -= diff.y; }
            if (/w/.test(handle)) { this.startSize.w -= diff.x; d.offset.left += diff.x; }
            if (/e/.test(handle)) { this.startSize.w += diff.x;  d.offset.left -= diff.x; }
        }
        this.trigger('scroll', this.eventData(e, {diff: diff, handle: handle}));
    },

    onBeforeStart: function(eData) {
        var handle = eData.data, e = eData.event, opt = this.opt,
              drg = this[eData.data].data('draggable');
        if (this.trigger('beforeStart', this.eventData(e, {handle: handle}))===false) return false;
        if (!this.checkKey('handle', e)) return false;
        this.dynamic.prepare();
        this.inProcess = true;
        drg.opt.scroll = opt.scroll;
        drg.opt.scrollStep = opt.scrollStep;
        drg.opt.scrollSensitivity = opt.scrollSensitivity;
        if (opt.renew||!this.snapCached) {
            if (opt.snap) this.initSnap($('.dnmc-draggable', this.o).add(this.dom), '.dnmc-resizable');
            this.snapCached=true;
        }
        if (opt.container) drg.opt.bound = this.getBoundsFromContainer();
        else drg.opt.bound = opt.bound;
        if (opt.iframeFix) this.createIframeFix();
        this.dynamic.sizeChangeOnly = opt.axis == 'x' ? 'w' : opt.axis == 'y' ? 'h' : false;
        if (opt.helper && this.checkKey('helper', e)) {
            this.createHelper(handle, e);
            drg.opt.helperAppendTo = this.helper;
        }
        if (opt.helper || (handle && this[handle][0].customHandle)) drg.opt.helper=true;
    },

    onDragStart: function(eData) {
        var handle = eData.data, e = eData.event, d = this.dynamic, opt = this.opt,
              drg = eData.data ? this[eData.data].data('draggable') : false;
        if (!this.helper && opt.opacity) {
            this.opacity = this.o.css('opacity');
            this.o.css('opacity', opt.opacity);
        }
        if (handle && (opt.helper||this[handle][0].customHandle) &&
            !opt.cls.handleHelper && !opt.cls[handle+'Helper']) {
                drg.moving.css({background: 'transparent', visibility: 'hidden'});
        }
        d.setMinSize(opt.min);
        d.setMaxSize(opt.max);
        d.setRatio(opt.ratio);
        if (opt.grid) d.setSizeGrid(opt.grid, (handle?opCorners[handle]: 'se'));
        else d.setSizeGrid(false, false);
        this.cssPosition = this.o.data('dynamic').cssPosition;
        this.startSize = {w: d.cssSize.width, h: d.cssSize.height };
        this.startPosition = {left: d.position.left, top: d.position.top};
        this.startOffset = { left: d.offset.left, top: d.offset.top };
        if (handle) {
            this.startHandleOffset = {
                left: drg.dynamic.offset.left,
                top: drg.dynamic.offset.top
            };
            if (opt.min || opt.max) this.setBounds(handle);
            if (drg.opt.bound) drg.opt.bound = this.correctHandleBound(handle, drg.opt.bound);
        }
        if (opt.cls.resize) this.o.addClass(opt.cls.resize);
        this.trigger('start', this.eventData(e, {handle: handle}));
    },

    onBeforeEnd: function(eData, callback) {
        var handle = eData.data, e = eData.event, d = this.dynamic, opt = this.opt, th = this;
        if (!callback) callback = this.onDragEnd;
        this.trigger('beforeEnd', this.eventData(e, {handle: handle}));
        if (this.opt.animate && this.checkKey('animate', e)) {
            if (this.opt.restore && this.checkKey('restore', e)) {
                d.cssSize = {width: this.startSize.w, height: this.startSize.h};
                d.position = this.startPosition;
                d.update('both', opt.animate, opt.easing, function() {
                    callback.call(th, eData);
                });
            } else if (opt.helper && this.helper && this.o[0] != this.helper[0]) {
                var _d = this.o.data('dynamic');
                _d.prepareGeneral().prepareSizeRelated();
                d.prepareAbsolute();
                _d.position = _d.convertPosition(this.dynamic.offset, 'relative');
                _d.cssSize = _d.convertSize(this.dynamic.size, 'inner');
                this.toggleHandles('off');
                _d.update('both', opt.animate, opt.easing, function() {
                    th.toggleHandles('on');
                    callback.call(th,eData);
                });
            }
        } else if (!opt.animate && opt.restore && this.checkKey('restore', e)) {
                d.cssSize = {width: this.startSize.w, height: this.startSize.h};
                d.position = this.startPosition;
                d.update('both');
                callback.call(th, eData);
        }
        else callback.call(this, eData);
    },

    onDragEnd: function(eData) {
        var handle = eData.data, e = eData.event, opt = this.opt, hd = handle ? this[handle].data('dynamic') : false;
        if (handle && this[handle][0].customHandle && opt.helper) {
            hd.position = hd.convertPosition(this.startHandleOffset, 'relative');
            hd.update('position');
        }
        if (this.opacity !== false) {
            this.o.css('opacity', this.opacity);
        }
        if (opt.helper && this.helper && this.helper[0] != this.o[0]) {
            this.removeHelper();
            this.dynamic.update('both');
            if (handle) this.updateHandles();
        } else if (opt.restore && handle) {
            this.updateHandles();
        }
        this.startSize = false;
        if (handle) {
            var hd = this[handle].data('draggable');
            hd.opt.helper = false;
            hd.opt.bound = false;
            hd.dynamic.setBounds(false);
        }
        if (opt.cls.resize) this.o.removeClass(opt.cls.resize);
        this.trigger('end', this.eventData(e, {handle: handle}));
        if (opt.iframeFix) this.removeIframeFix();
        this.inProcess = false;
        this.resetVars();
    },

    onDragResize: function(eData) {
        var handle = eData.data, e = eData.event, o = eData.self, opt = this.opt,
              d = this.dynamic, snpd = this.snapped, drg = eData.self.data('draggable');
        drg.dynamic.offset = drg.dynamic.convertPosition(drg.dynamic.position, 'absolute');
        var xdiff = drg.dynamic.offset.left - this.startHandleOffset.left;
        var ydiff = drg.dynamic.offset.top - this.startHandleOffset.top;
        var xmod = /w/.test(handle) ? -1 : 1;
        var ymod = /n/.test(handle) ? -1 : 1;
        var h = 0;
        var changePos = handle == 's' || handle == 'se' || handle == 'e' ? false : true;
        if ('static'==d.cssPosition) changePos = false;
        d.ratioCorrectionMode = handle=='n'||handle=='s' ? 'h' : 'w';
        if (opt.axis!='y' && !snpd['l'] && !snpd['r']) d.cssSize.width = this.startSize.w+xdiff*xmod;
        if (opt.axis!='x' && !snpd['t'] && !snpd['b']) h = d.cssSize.height = this.startSize.h+ydiff*ymod;

        if (changePos) {
            if (opt.axis != 'y' && handle != 'ne' && !snpd['l'] && !snpd['r'])
                d.offset.left = this.startOffset.left + xdiff;
            if (opt.axis != 'x' && handle != 'sw' && !snpd['t'] && !snpd['b'])
                d.offset.top = this.startOffset.top + ydiff;
        }
        if (this.snap) {
            d.size = d.convertSize(d.cssSize, 'outer');
            this.checkSnap(e);
        }
        if (snpd) this.unSnap(e);
        if (opt.withKey && opt.withKey.grid) d.checkSizeGrid = this.checkKey('grid',e);
        if (opt.withKey && opt.withKey.ratio) d.checkRatio = this.checkKey('ratio',e);
        if (d.cssSize.width < 1 && changePos && handle!='ne') d.offset.left -= -(d.cssSize.width-1);
        if (d.cssSize.height < 1 && changePos && handle!='sw') d.offset.top -= -(d.cssSize.height-1);
        d.correctSize();
        if (changePos && opt.ratio && (handle == 'nw' || handle=='ne') && this.checkKey('ratio',e))
            d.offset.top += h - d.cssSize.height;
        if (changePos) d.preparePosition().update('both');
        else d.update('size');
        if (!opt.helper) this.updateHandles();
        this.trigger('sizeChange', this.eventData(e, {handle: handle}), true);
    },

    onWheel: function(e, delta) {
        if (!this.checkKey('wheel', e)) return true;
        if (!this.opt.animate || this.opt.wheel !== true) return this.doWheelResize(e, delta);
        if (delta != this.wdelta) {
            if (this.inProcess) { this.dynamic.o.stop(true, true); }
            this.wstrength = 5;
        }
        this.wdelta = delta;
        this.wstrength *= 1.8;
        if (this.wstrength > 100) this.wstrength = 100;
        if (!this.wtimer) { var th = this; this.wtimer = window.setTimeout(function() { th.doWheelResize(e, delta); }, 50); }
        return false;
    },

    doWheelResize: function(e, delta) {
        var d = this.dynamic, opt = this.opt, th = this;
        if (this.inProcess) d.o.stop(true,true);
        this.inProcess = true;
        this.wtimer = false;
        if (!d.oParent) d.prepareGeneral();
        d.prepareAbsolute().preparePosition();
        if (!d.cssSize) d.prepareSizeRelated();
        var prevSize = {w: d.cssSize.width, h: d.cssSize.height};
        var step = opt.wheel === true ?
            Math.round(d.cssSize.width/
                (opt.animate ? (100/this.wstrength) : 10)
            ) : opt.wheel;
        this.wstrength = 5;
        if (opt.axis != 'y') d.cssSize.width += step * (delta>0? 1: -1);
        if (opt.axis != 'x') d.cssSize.height += step * (delta>0? 1: -1);
        d.setMinSize(opt.min);
        d.correctSize();
        if ('static' != d.cssPosition) {
            d.position.left += Math.round((prevSize.w - d.cssSize.width)/2);
            d.position.top += Math.round((prevSize.h - d.cssSize.height)/2);
        }
        if (opt.animate) this.toggleHandles('off');
        d.update('both', opt.animate, opt.easing, function() {
            th.updateHandles();
            th.trigger('sizeChange', th.eventData(e, {delta: delta}), true);
            th.inProcess = false;
            if (th.opt.animate) th.toggleHandles('on');
        });
        return false;
    },

    onMouseDown: function(e) {
        if (this.trigger('beforeStart', this.eventData(e))===false) return false;
        if (!this.checkKey('clickndrag', e)) return false;
        this.inProcess = true;
        if (this.opt.container) this.opt.bound = this.getBoundsFromContainer();
        this.startMouse = {x: e.pageX, y: e.pageY};
        this.mouseDelay(e, this.onClicknDragStart, this);
        return false;
    },

    onClicknDragStart: function(e) {
        if (this.opt.iframeFix) this.createIframeFix();
        if (this.opt.bound) this.dynamic.setBounds(this.opt.bound);
        this.dynamic.prepare();
        if (this.opt.helper) this.createHelper(false, e);
        this.onDragStart({data: false, event: e, self: this.o});
        var th = this;
        $('body').bind('mouseup.dnmcresize', function(e) { th.onBeforeEnd({event: e, handle: false, self: th.o}, th.onMouseUp); return false;})
                     .bind('mousemove.dnmcresize', function(e) { return th.onClicknDrag(e);});
    },

    onClicknDrag: function(e) {
        var d = this.dynamic, opt = this.opt;
        if (opt.axis != 'y') d.cssSize.width = this.startSize.w + (this.startMouse.y-e.pageY);
        if (opt.axis != 'x') d.cssSize.height = this.startSize.h + (this.startMouse.y-e.pageY);
        d.correctSize();
        d.position.left = this.startPosition.left + Math.floor((this.startSize.w - d.cssSize.width)/2);
        d.position.top = this.startPosition.top + Math.floor((this.startSize.h - d.cssSize.height)/2);
        d.update('both');
        if (!opt.helper) this.updateHandles();
        this.trigger('sizeChange', this.eventData(e), true);
        return true;
    },

    onMouseUp: function(eData) {
        $('body').unbind('mouseup.dnmcresize').unbind('mousemove.dnmcresize');
        this.onDragEnd(eData);
        this.dynamic.prepareGeneral();
        this.updateHandles();
        return false;
    }
});

/* jQuery plugins
 *****************************************************************/

var itf = {draggable: draggable, droppable: droppable, resizable: resizable};

$.each(itf, function(i) {
    //var innerName = 'dnmc'+i.substr(0,1).toUpperCase()+i.substr(1);
    $.fn[i]= function(options) {
        if ('destroy'==options) return this.each(function(){
            var dnmc = $(this).data(i);
            if (dnmc==undefined) return true;
            dnmc.toggle(false);
            $(this).removeData(i);
            return true;
        });
        if ('restart'==options) return this.each(function(){
            var dnmc = $(this).data(i);
            if (dnmc==undefined) return true;
            dnmc.toggle(false).toggle(true);
        });
        var tp = typeof options;
        return this.each(function() {
            var initial = false, o = $(this), dnmc = o.data(i);
            if (dnmc == undefined) {
                initial = true;
                o.data(i, new itf[i](this));
                dnmc = o.data(i);
            }
            if (initial) {
                var opt = $.extend({}, $.fn[i].defaults, options);
                dnmc.setOptions(opt);
            }
            if (!initial && (!options || tp == 'object')) dnmc.setOptions(options);
            if (tp == 'string') {
                if (options.indexOf('!')==0 && $.fn[i].presets[options.substr(1)]) o.unbind('.'+i+'.'+options.substr(1));
                else if ($.fn[i].presets[options]) {
                    var pOpt = $.fn[i].presets[options];
                    dnmc.setOptions(pOpt, options);
                }
            }

            if (initial && !opt.skipEnable) dnmc.toggle(true);
            if (!initial && (tp == 'boolean' || options=='enable' || options == 'disable')) dnmc.toggle(options);
        });
    };
    $.fn[i].defaults = {};
    $.fn[i].presets = {};
});

})(jQuery);