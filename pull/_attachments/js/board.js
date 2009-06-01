var Board = {
	start : function() {
		$.CouchApp(function(app) {
			Cushion.onTopOf(app, "stream",
				{
					group: true
				}, {
					"Stop": Station,
					"Work": Work
				},
				function () {
				        $(".connectedSortable").sortable({
				            connectWith: '.connectedSortable',
							dropOnEmpty: true
				        }).disableSelection();

						$("#stations").sortable().disableSelection();

						// now go over and initialize any newly created thickbox

						// initialize thickbox on the ready-to-be-thickbox
						tb_init('a.ready-to-be-thickbox');//pass where to apply thickbox
						// because these are now initialized, remove class ready-to-be-thickbox
						$(".ready-to-be-thickbox").removeClass("ready-to-be-thickbox");

						// now go over and initialize any newly created draggables or droppables

						// initialize draggable on the ready-to-be-draggable
						//$(".ready-to-be-draggable").draggable({containment: '.droppable'});
						//$(".ready-to-be-draggable").draggable();
						// because these are now initialized, remove class ready-to-be-draggable
						//$(".ready-to-be-draggable").removeClass("ready-to-be-draggable");

						// initialize droppable on the ready-to-be-droppable
						//$(".ready-to-be-droppable").droppable({
							//drop : function(event, ui) {
								//var work = ui.draggable.data("work");
								//var foo = $(this);
								//var p = $(this).position();
								//var top = ui.position.top;
								//var left = ui.position.left;
								//work.station($(this).data("station"), top, left);
							//}
						//});
						// because these are now initialized, remove class ready-to-be-droppable
						//$(".ready-to-be-droppable").removeClass("ready-to-be-droppable");
				}
			);

			//$(".draggable").draggable();
			//$(".droppable").droppable({
				//drop: function(event, ui) {
					//$(this).addClass('ui-state-highlight').find('p').html('Dropped!');
					//$(ui.draggable).addClass('foo');
				//},
				//out: function(event, ui) {
					//$(this).addClass('ui-state-highlight').find('p').html('empty');
					//$(ui.draggable).removeClass('foo');
				//}

			//});
		});
	}
}
//
// Station
//
// When created, register it and create the static HTML to visualize this station
//
function Station(json) {
	this.id = json._id;
	this.name = json.name;
    this.max_in_progress = 6;
    
    var empty_html = "";

    for (var i = 0; i < this.max_in_progress; ++i) {
        empty_html += "<li class='ui-state-default empty'>&nbsp;</li>";
    }
    
	$("#stations").append(
        "<div class='lane'>" +
            "<p class='station-header'>" +
                this.name +
            "</p>" +
            "<div>" +
                "<ul id='" + this.id + "' class='sortable connectedSortable'>" +
                "</ul>" +
            "</div>" +
            "<div style='z-index: -1; position: absolute'>" +
                "<ul id='" + this.id + "_empty' class='sortable'>" +
                    empty_html +
                "</ul>" +
            "</div>" +
            "<p class='station-footer'>" +
                this.max_in_progress +
            "</p>" +
        "</div>");

	var width = $("#" + this.id + "_empty").width();
	var height = $("#" + this.id + "_empty").height();
	$("#" + this.id).css({
		width: width,
		height: height
	});
	//$("#stations > #" + this.id).data("station", this);

	this.updateByJSON(json);

}

Station.prototype.updateByJSON = function(json) {
	this.name = json.name;
	this.position = json.position;

	// now update...
	//$("#stations > #" + this.id).html("<p>" + this.id + " " + this.name + "</p>");
}

//
// Work
// this represents a 'work' in the stream
//
// When created, register it and create the static HTML to visualize this work
//
function Work(json) {
	this.id = json._id;
	this.station_id = json.stop_id;
	this.title = json.title;

	$("#" + this.station_id).append("<li id='" + this.id + "' class='ui-state-default'>" + this.title + "<a href='http://google.com'>(g)</a></li>");
	//
	//$("#" + this.station_id).append("<div id='" + this.id + "' class='ready-to-be-draggable draggable ui-widget-content'></div>");
	this.sortable = $("#" + this.id);
	this.sortable.data("work", this);

	this.updateByJSON(json);
}

Work.prototype.station = function(station, top, left) {
	//this.station_id = station.id;
	//this.top = top;
	//this.left = left;

	//this.save();

	//this.updateRendering();
}

Work.prototype.toJSON = function() {
	//var json = {
		//_id: this.id,
		//_rev: this._rev,
		//original_url: this.original_url,
		//title: this.title,
		//stop_id: this.station_id,
		//top: this.top,
		//left: this.left,
		//cushion_type: "Work"
	//};
	//return json;
}

Work.prototype.updateByJSON = function(json) {
	this._rev = json._rev;
	this.title = json.title;
	this.original_url = json.original_url;

	this.updateRendering();
};

Work.prototype.updateRendering = function() {
	//var j = this.jquery_draggable;
	//j.css({
		//top: this.top,
		//left: this.left,
		//position: "absolute"
	//});
	this.sortable.html(this.title +
		"<a href='" + this.original_url + "TB_iframe=true&height=250&width=400" +
		"' class='ready-to-be-thickbox thickbox'>" + "(original)</a>");
};

