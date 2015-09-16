var LOCAL = (function () {
    "use strict";
    return {
    	
    	add_get_apparatus_button : function () {
    	    document.getElementById('footer').innerHTML += '<input type="button" value="get apparatus" id="get_apparatus"/>';
    	    $('#get_apparatus').on('click', function () {
    		alert('apparatus')
    	    });
    	}

    }
        
}());