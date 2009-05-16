function(doc) {
	if(doc.cushion_type == 'Work'){
		emit(doc.stop_id, doc);
	} else if(doc.cushion_type == 'Stop'){
		emit(doc._id, doc);
	}
};
