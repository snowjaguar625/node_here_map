/**
	* Searches relevant example rows based on the input search text.
	*/
	function search() {
		// Get all example rows
		var rows = $('.sdk-examples-table tr'), matchCount = 0;

		// Define space regexp replacement
		var spaceReplacement = $operator.val() === 'or' ? '.*)|(.*' : '.*';
		// Define regular expression pattern
		var pattern = '(.*'
		+ $.trim($search.val()).replace(/ /g, spaceReplacement) + '.*)';
		// Define regular expression
		var regExp = new RegExp(pattern, 'i');

		// For each row
		rows.each(function(index) {
			var row = $(rows[index]);
			// Retrieve example description
			var description = $(row.find('td')[1]).text();
			// Row matches if the row description cell text contains the search text
			var matches = description.search(regExp) > -1
			|| description.split(' ').reverse().join(' ').search(regExp) > -1;
			// Update the CSS property 'display'
			row.css('display', matches ? 'table-row' : 'none');
			// Adjust the CSS class 'alt'
			row.toggleClass('alt', matches && ++matchCount % 2 !== 0);

		});
	};

	var $search;
	// Get the search input as a JQuery object
	$search = $('#search');
	$operator = $('#operator-select');


	// Add listeners
	$search.on('keyup', search);
	$operator.on('change', search);

	// Focus on the search input
	$search.focus();

	$( document ).ready(function() {
		console.log("READY");
		$( "#tabs" ).tabs();
		
		// Initialize the fancybox
		$(".fancybox").fancybox({
			parent: "body",
			type: 'image',
			prevEffect : 'none',
			nextEffect  : 'none',
			helpers : {
				title : {
					type: 'outside'
				},
				thumbs  : {
					width : 50,
					height  : 50
				}
			}
		});
	});