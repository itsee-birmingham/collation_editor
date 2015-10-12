var MENU = (function () {
    //with all of these menus which are switched in and out of with ajax each event handler is deleted before being
	//added in case the menu has existed before if we didn't do this then the event handlers would just stack up
    //and fire multiple times
    return {
        hello: function () {
            console.log('collation menus');
        },
        
        choose_menu_to_display: function (user, criteria, application, force_choice) {
            var remembered, html, new_criteria;
            remembered = CL.get_project_cookie();
            new_criteria = JSON.parse(JSON.stringify(criteria));
            if (remembered !== '') {
            	if (remembered !== 'None') {
            	    new_criteria._id = remembered;
            	}
            }
            CL._services.get_editing_projects(new_criteria, function(projects) {
        	if (force_choice) {
        	    MENU.load_project_select_menu(user, criteria, application, true);
        	} else if (remembered === 'None') {
        	    if (projects.length > 0) {
        		MENU.load_no_project_menu(user, criteria, true, application);
        	    } else {
        		MENU.load_no_project_menu(user, criteria, false, application);
        	    }
        	} else if (projects.length === 1) {
        	    if (projects[0].managing_editor === user._id) {
        		CL._managing_editor = true;
        	    }
        	    MENU.load_single_project_menu(projects[0], user, criteria, application);
        	} else if (projects.length > 1) {
        	    MENU.load_project_select_menu(user, criteria, application, true);
        	} else {
        	    if (remembered !== '') {
        		//we may have a cookie that doesn't have a legal project anymore
        		//so we need to delete the cookie and then check to see if the user has any 
        		//projects anyway
        		CL.delete_project_cookie();
        		MENU.choose_menu_to_display(user, criteria, application);
        	    } else {
        		MENU.load_no_project_menu(user, criteria, false, application);
        	    }
        	}
            });
        },
        
        load_no_project_menu: function (user, criteria, select_project, application) {
            var i, html, footer, callback;
            switch (application) {
            case 'collation':
        	MENU.load_collation_no_project_menu();
        	break;
            case 'versions':
        	VER.load_no_project_menu();
        	break;
            }
            footer = [];
            if (select_project) {
        	footer.push('<input class="left_foot" type="button" id="switch_project_button" value="Switch project" />');
            }
            if (application === 'collation') {
        	footer.push('<input class="right_foot"  id="collation_settings" type="button" value="Change Collation Settings"/>');
            }
            document.getElementById('footer').innerHTML = footer.join('');
            CL.add_index_footer_handlers();
        },
        
      //TODO: find a way to retrieve book language combinations from the database and populate
        //selects dynamically and link them so only viable combinations can be selected
        load_collation_no_project_menu: function () {
            var html, callback;
            //TODO: need to add default display settings here and also set  CL._default_display_settings and CL._display_settings
            //TODO: should this really be stored in CL._project???
            if (CL._services.hasOwnProperty('regularisation_classes')) {
        	CL._project = {'rule_classes' : CL._services.regularisation_classes};
            } else {
        	CL._project = {'rule_classes' : DEF.regularisation_classes};
            }
            if (CL._services.hasOwnProperty('rule_conditions')) {
        	CL._rule_conditions = CL._services.rule_conditions;
            } else {
        	CL._rule_conditions = DEF.rule_conditions;
            }
            CL.set_display_settings();
            if (CL._services.hasOwnProperty('context_input')) {
        	CL._context_input = CL._services.context_input;
            }
            CL.set_overlapped_options({});
            html = [];
            html.push('<div id="verse_selection"><form id="collation_form"><label>Select verse: </label>');
            html.push('<select id="book"><option value="B02">Mark</option><option value="B04">John</option><option value="B09">Galatians</option><option value="B14">2 Thessalonians</option></select>');
            html.push('<input type="text" size="2" id="chapter"/>:');
            html.push('<input type="text" size="2" id="verse"/>');
            html.push('<select id="language"><option value="grc">Greek</option><option value="lat">Latin</option></select>');
            html.push('<input type="hidden" id="collation_source" value="WCE"/>');
            html.push('<input type="hidden" id="base_text_siglum" value=""/>');
            html.push('<input type="button" id="find_witnesses_button" value="Select Witnesses"/>');
            html.push('<input type="button" id="find_saved_button" value="Load Saved Collation"/>');
            html.push('<input type="button" disabled="disabled" id="run_collation_button" value="Run Collation"/>');
            html.push('<div id="witnesses"></div></form><div id="saved_collations_div"></div></div>');
            CL._container.innerHTML = html.join('');
            callback = function () {$('#base_text').off('change.get_BT_siglum'); 
            			   $('#base_text').on('change.get_BT_siglum', function () {
				       if (document.getElementById('base_text_siglum')) {
					   document.getElementById('base_text_siglum').value = document.getElementById('base_text').options[document.getElementById('base_text').selectedIndex].text;
				       }
				   });
            			   };
	    $('#find_witnesses_button').off('click.find_witnesses');
	    $('#find_witnesses_button').on('click.find_witnesses', function () {MENU.find_witnesses(callback)});
	    $('#find_saved_button').off('click.find_saved');
	    $('#find_saved_button').on('click.find_saved', CL.find_saved);
	    $('#run_collation_button').off('click.run_collation');
	    $('#run_collation_button').on('click.run_collation', function () {
        	RG.prepare_collation(CL._display_mode); });
            SPN.remove_loading_overlay();
        },
        
        load_single_project_menu: function (project, user, criteria, application, select_project) {
            switch (application) {
            case 'collation':
        	CL.load_single_project_menu(project);
        	break;
            case 'versions':
        	//just check that at least one language is assigned to this user
        	//at this stage the user is in this list of all versionists
        	//so if they do not have an assigned language the project config is messed up
        	if (project.versionists[user._id].length === 0) {
        	    VER.load_no_project_menu();
        	} else {
        	    VER.load_single_project_menu(project, user);
        	}
        	break;
            }
	},

        load_project_select_menu: function (user, criteria, application, select_project) {	    
	    MAG.REST.apply_to_list_of_resources('editing_project', {'criteria': criteria, 
		'success': function (response) {
		    var html, data;
		    html = [];
		    html.push('<form id="project_select_form">');
		    html.push('<label for="project">Select the project you want to work in from the list below: ');
		    html.push('<select id="project"></select></label><br/>');
		    html.push('<p>If you would like the browser to remember you are working in this project for the rest of this session (until your browser is closed) then you can tick the \'Remember project\' box below.</p>');
		    html.push('<p>By ticking the box and clicking on continue you are giving you permisison for a cookie to be stored in your browser.</p>');
		    html.push('<label for="remember_project">Remember project: <input type="checkbox" id="remember_project"/></label>');
		    html.push('<br/><br/><input type="button" id="project_select_button" value="Continue"/>');
		    html.push('</form>');
		    CL._container.innerHTML = html.join('');
		    data = [{'_id': 'None'}];
		    data.push.apply(data, response.results);
		    U.FORMS.populate_select(data, document.getElementById('project'), '_id', '_id', CL._project._id, false);
		    $('#project_select_button').on('click', function () {
			MENU.select_working_project(user, criteria, application, select_project);
		    });		  
		    document.getElementById('footer').innerHTML = '';
		    SPN.remove_loading_overlay();
		}});
	},
	
	select_working_project: function (user, criteria, application, select_project) {
	    var new_criteria;
	    if (document.getElementById('project').value === 'None') {
		if (document.getElementById('remember_project').checked === true) {
		    document.cookie="project=None";
		}
		MENU.load_no_project_menu(user, criteria, true, application);
		return;
	    } 
	    new_criteria = JSON.parse(JSON.stringify(criteria));
	    new_criteria['_id'] = document.getElementById('project').value;
	    MAG.REST.apply_to_list_of_resources('editing_project', {
		'criteria': new_criteria, 
		'success': function (response) {
		    if (response.results.length === 0) {
			document.cookie = "project=; path=/collation/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
			MENU.load_no_project_menu(user, criteria, true, application);
		    } else {
			if (document.getElementById('remember_project').checked === true) {
			    document.cookie="project=" + response.results[0]._id + '; path=/collation/';
			}
			MENU.load_single_project_menu(response.results[0], user, criteria, application, select_project);
		    }
	    }});
	},
	
	/*
	 * Take all the transcription data provided (in witnesses) and display in columns based
	 * on document type with the labels for any witnesses lacunose in the sepecified verse in grey
	 * options:	
	 * 	verse: string: the verse reference you are interested in
	 * 	parent_elem: element: the parent in the html to put the results (defaults to body if not supplied)
	 * 	base_text: string: the base text to select
	 * 	checked: boolean: whether or not the boxes should all be checked by default (default false)	
	 * 
	 * */
	show_witnesses: function (witnesses, options) {
	    var i, j, witnesses_obj, keys, html, cls, key, base_texts, checked_string;
	    if (document.getElementById('saved_collations_div')) {
		document.getElementById('saved_collations_div').innerHTML = '';
	    }
    	    CL._services.get_user_info(function (user) {
	    if (user) {
        	//organise the witnesses into a dictionary with document_type as key
    		witnesses_obj = {};
    		for (i = 0; i < witnesses.length; i += 1) {
    		    if (witnesses_obj.hasOwnProperty(witnesses[i].document_type)) {
    			witnesses_obj[witnesses[i].document_type].push(witnesses[i]);
    		    } else {
    			witnesses_obj[witnesses[i].document_type] = [witnesses[i]];
    		    }
    		}
    		//get all the keys and sort them
    		//TODO: create custom sort to fix order
    		keys = [];
    		for (key in witnesses_obj) {
    		    if (witnesses_obj.hasOwnProperty(key)) {
    			keys.push(key);
    		    }
    		}
    		keys.sort();
    		//now build the html
    		html = [];
    		base_texts = [];
    		if (typeof options.checked !== 'undefined' && options.checked === true) {
    		    checked_string = 'checked="checked" '; // space is needed
    		} else {
    		    checked_string = '';
    		}
    	    
    		for (i = 0; i < keys.length; i += 1) {
    		    if (witnesses_obj.hasOwnProperty(keys[i])) {
    			html.push('<div class="wit_column"><input type="checkbox" ' + checked_string + 'id="Every_'
    			    + keys[i] + '"/><label for="Every_'
    			    + keys[i] + '">Every '
    			    + keys[i] + '</label><br/>');
    			for (j = 0; j < witnesses_obj[keys[i]].length; j += 1) {
    			    if (typeof options.verse === 'undefined' || 
    				    witnesses_obj[keys[i]][j].verses.indexOf(options.verse) !== -1) {
    				cls = 'extant';
    			    } else {
    				cls = 'lac';
    			    }
    			    if (keys[i] === 'private') {
				html.push('<input type="checkbox" ' + checked_string + 'id="'
					+ witnesses_obj[keys[i]][j]._id + '" name="'
					+ witnesses_obj[keys[i]][j]._id + '"/><label for="'
					+ witnesses_obj[keys[i]][j]._id + '" class="' + cls + '">'
					+ witnesses_obj[keys[i]][j].siglum.replace('_private', '') + '</label><br/>');
    			    } else {
    				html.push('<input type="checkbox" ' + checked_string + 'id="'
    					+ witnesses_obj[keys[i]][j]._id + '" name="'
    					+ witnesses_obj[keys[i]][j]._id + '"/><label for="'
    					+ witnesses_obj[keys[i]][j]._id + '" class="' + cls + '">'
    					+ witnesses_obj[keys[i]][j].siglum.replace('_private', '') + '</label><br/>');   	
    			    }
    			    //Use hand as the key here even though it is really siglum because it makes the sorting work!
    			    if (keys[i] === 'private') {
    				base_texts.push({'hand': witnesses_obj[keys[i]][j].siglum.replace('_private', ' (private)'), 'value': witnesses_obj[keys[i]][j]._id + '|' + user._id}); 
    			    } else {
    				base_texts.push({'hand': witnesses_obj[keys[i]][j].siglum, 'value': witnesses_obj[keys[i]][j]._id}); 
    			    }
    			}
    			html.push('</div>');
    		    }
    		}
    		if (!options.hasOwnProperty('show_basetext_select') || options.show_basetext_select !== false) { //TODO: this should be positive but can't be bothered to add true to all the options that need it
    		    html.push('<div class="wit_column"><label for="base_text">Base Text</label><br/><select id="base_text"></select></div>');
    		}
    		//send html to browser
    		if (typeof options.parent_elem === 'undefined') {
    		    options.parent_elem = document.getElementsByTagName('body')[0];
    		}
    		base_texts = CL.sort_witnesses(base_texts);
    		options.parent_elem.innerHTML = html.join('');
    		if (!options.hasOwnProperty('show_basetext_select') || options.show_basetext_select !== false) { //TODO: this should be positive but can't be bothered to add true to all the options that need it
    		    //populate base_text drop down and add event to select base_text in witness list if not already ticked
    		    U.FORMS.populate_select(base_texts, document.getElementById('base_text'), 'value', 'hand', options.base_text);
    		    $('#base_text').on('change', function (event) {MENU.check_base_text_selection(event.target.value)});
    		}
    		//now add event handlers for ticking and unticking and submission buttons
    		for (i = 0; i < keys.length; i += 1) {
    		    if (witnesses_obj.hasOwnProperty(keys[i])) {
    			$('#Every_' + keys[i]).on('click', function (event) {CL.check_witnesses(event.target.id); });
    			for (j = 0; j < witnesses_obj[keys[i]].length; j += 1) {
    			    $('#' + witnesses_obj[keys[i]][j]._id).on('click', function (event) {CL.check_witness_lead(event.target.id); });
    			}
    		    }
    		}
	    }
	    });
	},
	
	/*
	 * Get all the transcriptions of the specified book in the specified language 
	 * ensuring you only get the fields you need because the tei field for 
	 * transcriptions is huge and runs local storage out of memory
	 * TODO: add default base texts for languages other than Greek
	 */
	find_witnesses: function (callback) {
	    var book, chapter, verse, language, ref, default_base;
	    book = undefined;
	    chapter = undefined;
	    verse = undefined;
	    language = undefined;
	    book = document.getElementById('book').value;
	    chapter = document.getElementById('chapter').value;
	    verse = document.getElementById('verse').value;
	    language = document.getElementById('language').value;
	    if (language === 'grc') {
		default_base = 'NA28';
	    }
	    if (book !== 'none' && !CL.is_blank(chapter) && !CL.is_blank(verse) && language !== 'none') {
		SPN.show_loading_overlay();
		ref = book + 'K' + chapter + 'V' + verse;		
		CL._services.get_user_info(function (user) {
		if (user) {
		    MAG.REST.apply_to_list_of_resources('transcription', {'criteria' : {'book_string' : book,
			'language' : language,
		    '_sort': [['siglum', 1]]},
		    'fields': ['book_string', 'verses', 'siglum', 'document_type', 'siglum'],
		    'success': function (results) {
			MAG.REST.apply_to_list_of_resources('private_transcription', {'criteria' : {'book_string' : book,
			    'language' : language, 'user': user._id,
			'_sort': [['siglum', 1]]},
			'fields': ['book_string', 'verses', 'siglum', 'document_type', 'siglum'],
			'success': function (private_results) { 
			    results.results.push.apply(results.results, private_results.results);
			    MENU.show_witnesses(results.results, {'verse':ref, 'base_text':default_base, 'checked':true, 'parent_elem': document.getElementById('witnesses')});
			    document.getElementById('header').innerHTML = CL.get_header_html('Collation',ref);
			    CL._services.show_login_status();			    
			    SPN.remove_loading_overlay();
			    document.getElementById('run_collation_button').disabled = false; 
			    if (typeof callback !== 'undefined') {
				callback();
			    }
			}});
		    }});
		}
		});
	    }
	},
	
	check_base_text_selection: function (witness) {
	    if (document.getElementById(witness)) {
		document.getElementById(witness).checked = true;
	    }
	},
           

    };
}());