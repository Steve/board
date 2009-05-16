function(keys, values, rereduce) {
	var stop = {};
	var works = [];

	for(var i = 0; i < values.length; i++){
		if(values[i].cushion_type == 'Work'){
			works.push(values[i]);
		}
		if(values[i].cushion_type == 'Stop'){
			stop = values[i];
		}
	}
	return { "stop" : stop, "works" : works};
};
