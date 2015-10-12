var LOCAL = (function () {
    "use strict";
    return {
	
	test: function () {
	    console.log('I am working')
	},
	
	project_witness_sort : function (witnesses) {
	    return witnesses.sort(LOCAL.compare_witness_types);
	},
	
	//used before moving to order readings to make sure that a decision has been made on all top line overlapped readings
        are_no_duplicate_statuses: function () {
            var i, j;
            for (i = 0; i < CL._data.apparatus.length; i += 1) {
        	for (j = 0; j < CL._data.apparatus[i].readings.length; j += 1) {
        	    if (CL._data.apparatus[i].readings[j].hasOwnProperty('overlap_status') 
        		    && CL._data.apparatus[i].readings[j].overlap_status === 'duplicate') {
        		return false;
        	    }
        	}
            }
            return true;
        },
        
        check_om_overlap_problems: function () {
            var i, unit, j, witnesses, key, ol_unit;
            //check to see if any readings labelled 'overlapped' don't have any text in the overlapped reading
            //if they do then that needs fixing.
            for (i = 0; i < CL._data.apparatus.length; i += 1) {
        	unit = CL._data.apparatus[i];
        	if ('overlap_units' in unit) {
        	    witnesses = [];
        	    for (j = 0; j < unit.readings.length; j += 1) {
        		if ('overlap_status' in unit.readings[j] 
        			&& unit.readings[j].overlap_status === 'overlapped') {
        		    witnesses.push.apply(witnesses, unit.readings[j].witnesses);
        		}
        	    }
        	    //for each witness we've collected
        	    for (j = 0; j < witnesses.length; j += 1) {
        		for (key in unit.overlap_units) {
        		    if (unit.overlap_units[key].indexOf(witnesses[j]) != -1) {
        			ol_unit = CL.find_overlap_unit_by_id(key);
        			if (ol_unit.readings[1].text.length > 0) {//hard coded 1 is fine as at this stage there is only one reading and its always here
        			    return true;
        			}
        		    }
        		}
        	    }
        	}
            }
            return false;
        },

	get_context_from_input_form: function () {
            var book, chapter, verse, ref
            book = document.getElementById('book').value;
            chapter = document.getElementById('chapter').value;
            verse = document.getElementById('verse').value;
            if (book !== 'none' && !CL.is_blank(chapter) && !CL.is_blank(verse)) {
                ref = book + 'K' + chapter + 'V' + verse; 
            }
            return ref;
        },
        
	compare_witness_suffixes: function (a, b) {
	    if (a[0] === '-' && b[0] === '-') {
		return a.replace('-', '') - b.replace('-', '')
	    }
	    if (a[0] === '*') {
		return -1;
	    }
	    if (b[0] === '*') {
		return 1;
	    }
	    return 0;
	    //could do more tests here for other suffixes but this is probably enough for now
	},

	compare_witness_numbers: function (a, b) {
	    var dig_regex, suf_regex, numberA, numberB, suffixA, suffixB;
	    dig_regex = /\d+/;
	    suf_regex = /\D+\d*/;
	    //extract just the number
	    if (!a.match(dig_regex) ||  !a.match(dig_regex)) {
		return -1
	    }
	    numberA = parseInt(a.match(dig_regex)[0], 10);
	    numberB = parseInt(b.match(dig_regex)[0], 10);
	    //if the numbers are the same deal with the suffixes
	    if (numberA === numberB) {
		if (a.match(suf_regex)) {
		    suffixA = a.match(suf_regex)[0];
		} else {
		    suffixA = [''];
		}
		if (b.match(suf_regex)) {
		    suffixB = b.match(suf_regex)[0];
		} else {
		    suffixB = [''];
		}
		if (suffixA[0] === 'S') {
		    if (suffixB[0] === 'S') {
			return LOCAL.compare_witness_suffixes(suffixA.substring(1), suffixB.substring(1));
		    }
		}
		return LOCAL.compare_witness_suffixes(suffixA, suffixB);
	    }
	    //if the numbers are not the same sort them
	    return numberA - numberB;
	},

	compare_witness_types: function (a, b) {
	    if ($.isPlainObject(a)) {
		a = a['hand']
	    }
	    if ($.isPlainObject(b)) {
		b = b['hand']
	    }
	    if (a[0] === 'P') {
		if (b[0] === 'P') {
		    return LOCAL.compare_witness_numbers(a.substring(1), b.substring(1));
		}
		return -1;
	    }
	    if (b[0] === 'P') {
		return 1;
	    }
	    if (a[0] === '0') {
		if (b[0] === '0') {
		    return LOCAL.compare_witness_numbers(a.substring(1), b.substring(1));
		}
		return -1;
	    }
	    if (b[0] === '0') {
		return 1;
	    }
	    if (!isNaN(a[0])) {
		if (!isNaN(b[0])) {
		    return LOCAL.compare_witness_numbers(a, b);
		}
		return -1;
	    }
	    if (!isNaN(b[0])) {
		return 1;
	    }
	    if (a[0] === 'L') {
		if (b[0] === 'L') {
		    return LOCAL.compare_witness_numbers(a.substring(1), b.substring(1));
		}
		return -1;
	    }
	    if (b[0] === 'L') {
		return 1;
	    }
	    return 0;
	},
    
    }
}());
    