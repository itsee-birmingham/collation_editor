var VMRCRE = (function () {

    return {


	servicesURL : 'http://ntvmr.uni-muenster.de/community/vmr/api',

	chapterSelectChanged : function() {
	    var book = $("#bookselect").val();
	    var chapter = $("#chapterselect").val();
	    $("#verseselect").html("");
	    $("#verseselect").append("<option></option>");
	    if (book != null && book.length > 0 && chapter != null && chapter.length > 0) {
		var params = {
			subset : book+"."+chapter,
			detail : "chapter"
		};

		$.get(VMRCRE.servicesURL + '/metadata/v11n/get/', params, function(result) {
		    var max = $(result).find('chapter').attr('verseMax');
		    for (var i = 1; i <= parseInt(max); ++i) {
			$("#verseselect").append("<option value='"+i+"'>"+i+"</option>");
		    }
		});
	    }
	},

	bookSelectChanged : function() {
	    var book = $("#bookselect").val();
	    $("#chapterselect").html("");
	    $("#chapterselect").append("<option></option>");
	    if (book != null && book.length > 0) {
		var params = {
			subset : book
		};

		$.get(VMRCRE.servicesURL + '/metadata/v11n/get/', params, function(result) {
		    var chapterMax = $(result).find('book').attr('chapterMax');
		    for (var i = 1; i <= parseInt(chapterMax); ++i) {
			$("#chapterselect").append("<option value='"+i+"'>"+i+"</option>");
		    }
		});
	    }
	    VMRCRE.chapterSelectChanged();
	},

	loadVersification : function(callback) {
	    var firstOption = $("#bookselect option:first");
	    if (!firstOption.length < 2) {
		var params = {
			detail : 'book'
		};

		$.get(VMRCRE.servicesURL + '/metadata/v11n/get/', params, function(result) {
		    $("#bookselect").html("");
		    $("#bookselect").append("<option></option>");
		    $(result).find('book').each( function() {
			$("#bookselect").append("<option value='"+$(this).attr('osisID')+"'>"+$(this).attr('osisID')+"</option>");
		    });
		    if (callback) callback();
		});
	    }
	},

	context_input_form_onload: function () {
	    VMRCRE.loadVersification();
	},
	
	get_context_from_input_form : function () {
		return $('#bookselect').val()+'.'+$('#chapterselect').val()+'.'+$('#verseselect').val();
	}
    }

}());
