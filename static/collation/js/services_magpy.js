
var magpy_services = {
	
	//compulsory settings
		
	supported_rule_scopes: {'once': 'This place, these MSS', 
	    			'verse': 'This verse, all MSS', 
	    			'manuscript': 'Everywhere, these MSS', 
	    			'always': 'Everywhere, all MSS'},

	//optional settings/functions
	local_javascript : ['http://' + SITE_DOMAIN + '/collation/js/menus.js', 
	                    'http://' + SITE_DOMAIN + '/magpy/js/mag.js',
	                    'http://' + SITE_DOMAIN + '/collation/js/magpy_functions.js'
	                    ],
	local_python_implementations: {
	                    "prepare_t": {
	                        "python_file": "collation.greek_implementations",
	                        "class_name": "PrepareData",
	                        "function": "prepare_t"
	                    },
	                    "set_rule_string": {
	                        "python_file": "collation.greek_implementations",
	                        "class_name": "PrepareData",
	                        "function": "set_rule_string"
	                    }
	                },
	witness_sort : function (witnesses) {
	    return witnesses.sort(LOCAL.compare_witness_types);
	},
	pre_stage_checks: {
	    "order_readings": [
        	{
        	   "function": "LOCAL.are_no_duplicate_statuses",
        	   "pass_condition": true,
        	   "fail_message": "You cannot move to order readings while there are duplicate overlapped readings"
        	},
        	{
        	   "function": "LOCAL.check_om_overlap_problems",
        	   "pass_condition": false,
        	   "fail_message": "You cannot move to order readings because there is a overlapped reading with the status 'overlapped' that has text in the overlapped unit"
        	},
	    ],
	    "approve": [
	        {
	            "function": "LOCAL.are_no_disallowed_overlaps",
	            "pass_condition": true,
	            "fail_message": "You cannot approve this verse because it has an overlapped reading which is identical in word range to a main apparatus unit."
	        }
	    ]
	},
	overlapped_options : [{
	    "id": "show_as_overlapped", 
	    "label": "Show as overlapped",  
	    "reading_flag": "overlapped",
	    "reading_label": "zu", 
	    "reading_label_display": "↑"
	}, 
	{
	    "id": "delete_reading", 
	    "label": "Delete reading", 
	    "reading_flag": "deleted",
	    "reading_label": "zu", 
	}],
	display_settings : {
            "python_file": "collation.greek_implementations",
            "class_name": "ApplySettings",
            "configs": [
                {
                    "id": "view_supplied",
                    "label": "view supplied text",
                    "function": "hide_supplied_text",
                    "menu_pos": 1,
                    "execution_pos": 5,
                    "check_by_default": true,
                    "apply_when": false
                },
                {
                    "id": "view_unclear",
                    "label": "view unclear text",
                    "function": "hide_unclear_text",
                    "menu_pos": 2,
                    "execution_pos": 4,
                    "check_by_default": true,
                    "apply_when": false
                },
                {
                    "id": "view_capitalisation",
                    "label": "view capitalisation",
                    "function": "lower_case_greek",
                    "menu_pos": 4,
                    "execution_pos": 3,
                    "check_by_default": false,
                    "apply_when": false
                },
                {
                    "id": "use_lemma",
                    "function": "select_lemma",
                    "menu_pos": null,
                    "execution_pos": 1,
                    "check_by_default": true,
                    "apply_when": true
                },
                {
                    "id": "expand_abbreviations",
                    "label": "expand abbreviations",
                    "function": "expand_abbreviations",
                    "menu_pos": 3,
                    "execution_pos": 2,
                    "check_by_default": true,
                    "apply_when": true
                },
                {
                    "id": "show apostrophes",
                    "label": "show apostrophes",
                    "function": "hide_apostrophes",
                    "menu_pos": 5,
                    "execution_pos": 6,
                    "check_by_default": false,
                    "apply_when": false
                },
                {
                    "id": "show_diaeresis",
                    "label": "show diaeresis",
                    "function": "hide_diaeresis",
                    "menu_pos": 6,
                    "execution_pos": 7,
                    "check_by_default": false,
                    "apply_when": false
                },
                {
                    "id": "show_punctuation",
                    "label": "show punctuation",
                    "function": "show_punctuation",
                    "menu_pos": 7,
                    "execution_pos": 8,
                    "check_by_default": false,
                    "apply_when": true
                }
            ]
        },
    
    rule_conditions : { 
        "python_file": "collation.greek_implementations",
        "class_name": "RuleConditions",
        "configs" : [
            {
                "id": "ignore_supplied",
                "label": "Ignore supplied markers",
                "linked_to_settings": true,
                "setting_id": "view_supplied",
                "function": "ignore_supplied",
                "apply_when": true,
                "check_by_default": false,
                "type": "string_application"
            },
            {
                "id": "ignore_unclear",
                "label": "Ignore unclear markers",
                "linked_to_settings": true,
                "setting_id": "view_unclear",
                "function": "ignore_unclear",
                "apply_when": true,
                "check_by_default": false,
                "type": "string_application"
            },
            {
                "id": "only_nomsac",
                "label": "Only apply to Nomina Sacra",
                "linked_to_settings": false,
                "function": "match_nomsac",
                "apply_when": true,
                "check_by_default": false,
                "type": "boolean"
            }
        ] 
    },
    
    context_input : {
		form: 'editor_index_details.html',
		result_provider : function () {
	    var book, chapter, verse, ref
	    book = document.getElementById('book').value;
	    chapter = document.getElementById('chapter').value;
	    verse = document.getElementById('verse').value;
	    if (book !== 'none' && !CL.is_blank(chapter) && !CL.is_blank(verse)) {
		ref = book + 'K' + chapter + 'V' + verse; 
	    }
	    return ref;
	},
	
	onload_function : function (project) {
	    bk = project.book;
	    if (!isNaN(bk)) {
		if (bk < 10) {
		    bk = 'B0' + bk;
		} else {
		    bk = 'B' + bk;
		}
	    }
	    document.getElementById('book_name').innerHTML = project.book_name;
	    document.getElementById('book').value = bk
            document.getElementById('language').value = project.language;
            document.getElementById('base_text').value = project.base_text;
            document.getElementById('project').value = project._id;
            document.getElementById('preselected_witnesses').value = project.witnesses.join();
	}
    },
	

        switch_project : function () {	    
            $('#switch_project_button').off('click.switch_project');
            $('#switch_project_button').on('click.switch_project', function () {
        	CL._services.get_user_info(function (user) {
        	    if (user) {
        		criteria = {'editors' : {'$in' : [user._id]}};
        		MENU.load_project_select_menu(user, criteria, 'collation', true);
        	    }
        	});
            });
        },

        view_project_summary : function () {
            $('#project_summary').off('click.project_summary');
            $('#project_summary').on('click.project_summary', function () {
        	//TODO: put project id on here when we have one and pick up in admin.js
        	window.location = 'project/';
            });
        },
        
    	//compulsory service functions
	initialise_editor : function () {
	    var criteria;
	    CL._services.show_login_status(function() {
		if (typeof output !== 'undefined') {
		    CL._display_mode = output;
		}
		CL._container = document.getElementById('container');
		CL._services.get_user_info(function (user) {	// success
		    if (user) {
			criteria = {'editors' : {'$in' : [user._id]}};
			//we are using the ITSEE interface
			//so display the correct menu for the circumstances
			MENU.choose_menu_to_display(user, criteria, 'collation');
		    }
		    else {		// failure
			CL._container.innerHTML = '<p>Please login using the link in the top right corner to use the editing interface</p>';
		    }
		});
	    });
	},
	
	get_login_url : function () { return "javascript:MAG.AUTH.log_user_in('" + window.location.href + "')"; },

	get_user_info : function (success_callback) {
	    MAG.AUTH.get_user_info({'success': success_callback, 'error': function () { success_callback(null); }});
	},
	
	get_user_info_by_ids : function (ids, success_callback) {
	    MAG.AUTH.resolve_user_ids(ids, {'force_reload': true,
		'success' : function (response) {
		    var user_info = {};
		    for (var k in response) {
			user_info[k] = { _id : k, name : response[k] };
		    }
		    success_callback(user_info);
		}, 'error' : function () {
		    success_callback(null);
		}});
	},

	show_login_status: function (callback) {
	    var elem, login_status_message;
	    elem = document.getElementById('login_status');
	    if (elem !== null) {
		CL._services.get_user_info(function (response) {
		    if (response) {
			if (response.hasOwnProperty('ITSEE_id')) {
			    login_status_message = 'logged in as ' + response.ITSEE_id;
			} else {
			    login_status_message = 'logged in as ' + response.name;
			}
			elem.innerHTML = login_status_message + '<br/><a href="javascript:MAG.AUTH.log_user_out(\'' + window.location.href + '\')">logout</a>';
		    } else {
			elem.innerHTML = '<br/><a href="'+CL._services.get_login_url()+'">login</a>';
		    }
		    if (callback) callback();
		});
	    }
	},
	
	get_editing_projects: function (criteria, success_callback) {
		MAG.REST.apply_to_list_of_resources('editing_project', {'criteria': criteria, 'success': function (response) {
			success_callback(response.results);
		}});
	},
	
	get_adjoining_verse: function (verse, is_previous, result_callback) {
		var context, bk, ch, v, nextCh, nextV;
		context = verse
		bk = context.substring(1, 3);
		ch = parseInt(context.substring(4, context.indexOf('V')), 10);
		v = parseInt(context.substring(context.indexOf('V') + 1), 10);
		nextCh = ch;
		nextV = v;
		MAG.REST.apply_to_resource('work', 'NT_B' + bk, {'success': function (response) {
			if (is_previous) {
				if (v === 0 && ch === 99) {
					nextCh = response.chapters;
					nextV = response.verses_per_chapter[response.chapters];
				} else  if (v === 1 && ch !== 0) {
					nextCh = ch - 1;
					if (nextCh === 0) {
						nextV = 0;
					} else {
						nextV = response.verses_per_chapter[nextCh];
					}
				} else if (v > 1) {
					nextV = v - 1;
				}
			} else {
				if (v + 1 <= response.verses_per_chapter[ch] && ch !== 99) {
					nextCh = ch;
					nextV = v + 1;
				} else if (ch !== response.chapters && ch !== 99) {
					nextCh = ch + 1;
					nextV = 1;
				} else if (ch === response.chapters) {
					nextCh = 99;
					nextV = 0;
				}
			}
			if (nextCh !== ch || nextV !== v) {
				return result_callback('B' + bk + 'K' + nextCh + 'V' + nextV);
			}
			return result_callback(null);
		}});
	},
	
	//WARNING: this returns only the specified fields which are fine for current uses but if extra uses are added extra fields may be needed.
	get_verse_data: function (verse, witness_list, private_witnesses, success_callback) {
		var search = {'context': verse, 'transcription_id' : {'$in': witness_list}};	
		MAG.REST.apply_to_list_of_resources((private_witnesses?'private_':'')+'verse', {'criteria': search, 'fields': ['transcription_id', 'siglum', 'duplicate_position', 'witnesses'], 'force_reload': true, 'success': function (response) {
			success_callback(response.results);
		}});
	},
	
	get_siglum_map: function (id_list, result_callback) {
	    MAG.REST.apply_to_list_of_resources('transcription', {'criteria': {'_id': {'$in': id_list}},
		'fields': ['siglum'],
		'success': function(response) {						    
		    var transcription_list;
		    transcription_list = response.results;
		    MAG.REST.apply_to_list_of_resources('private_transcription', {'criteria': {'_id': {'$in': id_list}},
			'fields': ['siglum'],
			'success': function(response) {
			    var siglum_map;						
			    transcription_list.push.apply(transcription_list, response.results);
			    siglum_map = {};
			    for (var i = 0; i < transcription_list.length; i += 1) {
				siglum_map[transcription_list[i].siglum] = transcription_list[i]._id;
			    }
			    result_callback(siglum_map);
			}});	
		}});
	},
	// if verse is passed, then verse rule; otherwise global
	get_rules_by_ids : function(ids, result_callback) {
	    MAG.REST.apply_to_list_of_resources('decision', {'criteria': {'_id': {'$in': ids}}, 'success': function (response) {
		result_callback(response.results);
	    }});
	},

	//get all rules that could be applied to the given verse
	get_rules : function (verse, result_callback) {	    
	    CL._services.get_user_info(function(current_user) {
		var shared, search_list, always, verse_once, ms, criteria;
		if (current_user) {
		    if (CL._project.hasOwnProperty('_id')) {
			shared = {'project': CL._project._id};
		    } else {
			shared = {'user': current_user._id};
		    }
		}
		search_list = [];
		always = JSON.parse(JSON.stringify(shared));
		always.scope = 'always';
		always.exceptions = {'$nin': [verse]};
		search_list.push(always);
		verse_once = JSON.parse(JSON.stringify(shared));
		verse_once.scope = {'$in': ['verse', 'once']};
		verse_once['context.unit'] = verse;
		search_list.push(verse_once);
		ms = JSON.parse(JSON.stringify(shared));
		ms.scope = 'manuscript';
		search_list.push(ms);
		criteria = {'$or': search_list};
		MAG.REST.apply_to_list_of_resources('decision', {'criteria': criteria, 'success': function (response) {
		    result_callback(response.results);
		}});
	    });
	},
	
	// if verse is passed, then verse rule; otherwise global
	update_rules : function(rules, verse, success_callback) {
	    MAG.REST.update_resources('decision', rules, {'success': function () {
		if (success_callback) success_callback();
	    }});
	},
	
	get_rule_exceptions : function(verse, result_callback) {
	    //could add a get user in here and do the rest in the callback
	    //if project use project else use user
	    MAG.REST.apply_to_list_of_resources('decision', {'criteria': {'project': CL._project._id, 'scope': 'always', 'exceptions': {'$in': [verse]}}, 'success': function (response) {
		result_callback(response.results);
	    }});
	},

	update_ruleset : function (for_deletion, for_global_exceptions, for_addition, verse, success_callback) {
	    var for_d, for_ge, i;
	    if (for_deletion.length > 0) {
		for_d = [];
		for (i = 0; i < for_deletion.length; ++i) { 
		    for_d.push(for_deletion[i]._id); 
		}
		MAG.REST.delete_resources('decision', for_d, {'success': function (deleted) {
		    return magpy_services.update_ruleset([], for_global_exceptions, for_addition, verse, success_callback);
		}});
	    } else if (for_global_exceptions.length > 0) {
		for_ge = [];
		for (i = 0; i < for_global_exceptions.length; i += 1) {
		    for_ge.push(for_global_exceptions[i]._id);
		}
		MAG.REST.apply_to_list_of_resources('decision', {'criteria': {'_id': {'$in': for_ge}}, 'success': function (response) {
		    for (i = 0; i < response.results.length; i += 1) {
			if (response.results[i].hasOwnProperty('exceptions')) {
			    if (response.results[i].exceptions.indexOf(verse) === -1 && verse) {
				response.results[i].exceptions.push(verse);
			    }
			} else {
			    response.results[i].exceptions = [verse];
			}
		    }
		    MAG.REST.update_resources('decision', response.results, {'success': function () {
			return magpy_services.update_ruleset(for_deletion, [], for_addition, verse, success_callback);
		    }});
		}});
	    } else if (for_addition.length > 0) {
		MAG.REST.create_resource('decision', for_addition, {'success': function (response) {
		    return magpy_services.update_ruleset(for_deletion, for_global_exceptions, [], verse, success_callback);
		}});
	    } else {
		if (success_callback) success_callback();
	    }
	},

	// save a collation
	// result: true if saved and successful, false otherwise
	save_collation: function (verse, collation, confirm_message, overwrite_allowed, no_overwrite_message, result_callback) {
	    //add in the NT specific stuff we need 
	    collation.verse = parseInt(verse.substring(verse.indexOf('V') + 1))
	    collation.chapter = parseInt(verse.substring(verse.indexOf('K') + 1, verse.indexOf('V')))
	    collation.book_number = parseInt(verse.substring(verse.indexOf('B') + 1, verse.indexOf('K')))
	    MAG.REST.create_resource('collation', collation, {'error' : function () {
		var confirmed;

		if (overwrite_allowed) {

		    confirmed = confirm(confirm_message);
		    if (confirmed === true) {
			MAG.REST.update_resource('collation', collation, {'success': function () {
			    result_callback(true);
			}});
		    } else {
			result_callback(false);
			return;
		    }
		} else {
		    alert(no_overwrite_message);
		    result_callback(false);
		    return;
		}
	    }, 'success': function () {
		result_callback(true);
	    }});
	},

	get_saved_stage_ids : function (verse, result_callback) {
	    CL._services.get_user_info(function (user) {
		if (user) {
		    var r, s, o, a, user_id, criteria, criteria_1, criteria_2, i;
		    r = null;
		    s = null;
		    o = null;
		    a = null;
		    user_id = user._id;
		    criteria_1 = {};
		    criteria_1.context = verse
		    criteria_1.user = user_id;
		    if (CL._project.hasOwnProperty('_id')) {
			criteria_1.project = CL._project._id;
			criteria_2 = {};
			criteria_2.context = verse;
			criteria_2.project = CL._project._id;
			criteria_2.status = 'approved';
			criteria = {'$or': [criteria_1, criteria_2]};
		    } else {
			criteria = criteria_1;
		    }
		    
		    MAG.REST.apply_to_list_of_resources('collation', {'criteria': criteria,
			'success': function (response) {
			    for (i = 0; i < response.results.length; i += 1) {
				if (response.results[i].status === 'regularised') {
				    r = response.results[i]._id;
				} else if (response.results[i].status === 'set') {
				    s = response.results[i]._id;
				} else if (response.results[i].status === 'ordered') {
				    o = response.results[i]._id;
				} else if (response.results[i].status === 'approved') {
				    a = response.results[i]._id;
				}
			    }
			    result_callback(r, s, o, a);
			}});
		}
	    });
	},

	load_saved_collation: function (id, result_callback) {
	    MAG.REST.apply_to_resource('collation', id, {'success' : function (response) {
		result_callback(response);
	    }, 'error': function () {
		result_callback(null);
	    }});
	},


	get_saved_collations : function (verse, user_id, result_callback) {
	    var criteria;
	    criteria = {};
	    criteria.context = verse;
	    CL._services.get_user_info(function (current_user) {
		if (current_user) {
		    if (CL._project.hasOwnProperty('_id')) {
			criteria.project = CL._project._id;
		    } else {
			criteria.user = current_user._id;
		    }
		    if (user_id) {
			criteria.user = user_id;
		    }
		    MAG.REST.apply_to_list_of_resources('collation', {'criteria' : criteria, 'fields': ['user', '_meta', 'status'], 'success' : function (results) {
			result_callback(results.results);
		    }});
		}
	    });
	},

	do_collation : function(verse, options, result_callback) {
	    var url;
	    if (typeof options === "undefined") {
		options = {};
	    }
	    url = 'http://' + SITE_DOMAIN + '/collationserver/' + verse + '/';
	    if (options.hasOwnProperty('accept')) {
		url += options.accept;
	    }    
	    $.post(url, { options : JSON.stringify(options) }, function(data) {
		result_callback(data);
	    }).fail(function(o) {
		result_callback(null);
	    });
	},

	

};

CL.set_service_provider(magpy_services);
