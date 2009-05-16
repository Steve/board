function(head, row, req, info) {
  respondWith(req, {
    html : function() {
      if (head) {
		var html = '<html><head><title>Pull Listing</title> <link rel="stylesheet" href="/pull/_design/pull/style/main.css" type="text/css"> <link rel="stylesheet" href="/pull/_design/pull/style/thickbox.css" type="text/css" media="screen" /></head>';

		html += '<body><h1>Listing</h1> total rows: '+head.total_rows+'<ul>';

		return html;


      } else if (row) {
		var page = row.value;
		// TODO parse original_url so we can append new query params
		var button = '<a href="' + page.original_url + 'TB_iframe=true&height=250&width=400" title="' + page.title + '" class="thickbox">' + page.title + 'Example 1</a>'
        return '\n<li>Id: ' + row.id + button + '</li>';
      } else {
        return '</ul>hello!</body> <script src="/_utils/script/jquery.js?1.2.6"></script> <script type="text/javascript" src="/pull/_design/pull/thickbox.js"></script> </html>';
      }
    },
    xml : function() {
      if (head) {
        return {body:'<feed xmlns="http://www.w3.org/2005/Atom">'
          +'<title>Test XML Feed</title>'};
      } else if (row) {
        // Becase Safari can't stand to see that dastardly
        // E4X outside of a string. Outside of tests you
        // can just use E4X literals.
        var entry = new XML('<entry/>');
        entry.id = row.id;
        entry.title = row.key;
        entry.content = row.value;
        return {body:entry};
      } else {
        return {body : "</feed>"};
      }
    }
  })
};
