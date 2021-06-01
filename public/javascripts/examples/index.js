$(function(){
	function search() {
		// Get all examples
		var examples = $('.container div');

		// Define space regexp replacement
		var spaceReplacement = $operator.val() === 'or' ? '.*)|(.*' : '.*';

		// Define regular expression pattern

		var pattern = '(.*' + $.trim($search.val()).replace(/ /g, spaceReplacement) + '.*)';

		// Define regular expression
		var regExp = new RegExp(pattern, 'i');
		
		// For each example
		examples.each(function(index)
		{
			var example = $(examples[index])[0];
			example.classList.toggle('hide', true);
		});
		
		examples.each(function(index)
		{
			// Retrieve example description + tags
			var description = $(examples[index]).data('type'), example = $(examples[index])[0];
				
			// data-type matches if the example description cell text contains the search text
			var matches = description.search(regExp) > -1 || description.split(' ').reverse().join(' ').search(regExp) > -1;

			if(matches)
				example.classList.remove('hide');
		});
	};
	
	/*
	var delay = (function(){
		var timer = 0;
			return function(callback, ms){
				clearTimeout (timer);
				timer = setTimeout(callback, ms);
			};
	})();*/

	var $search;
	// Get the search input as a JQuery object
	$search = $('#search');
	$operator = $('#operator-select');


	// Add listeners
	/*$('input').keyup(function() {
		delay(function() { search(); }, 1000 );
	});
	$operator.on('change', search);*/

	var
	  streamKey = Kefir.fromEvents($('input'), 'keyup'),
	  streamOperatorOr = Kefir.fromEvents($operator, 'change'),
	  mergedStreams = Kefir.merge([streamKey, streamOperatorOr]);
	
	mergedStreams.onValue(search);


	// Focus on the search input
	$search.focus();

}) 
    
	