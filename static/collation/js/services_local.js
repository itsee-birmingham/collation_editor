//
// local_services provides an implementation which does not require a database
var local_services = {
	
	//local services settings
	_current_project: 'default',
	
	//compulsory settings
	
	supported_rule_scopes: {'once': 'This place, these wits', 
	    			'always': 'Everywhere, all wits'},
	
	
	
	//optional settings/functions
	//local_javascript 
	//local_python_implementations
	//witness_sort
	//display_settings
	//rule_conditions
	//context_input
	    	
	//not overridable in project
	//switch_project
	//view_project_summary
	
	//compulsory service functions
	
	initialise_editor : function () {
	    CL._services.show_login_status(function() {
		CL._container = document.getElementById('container');
		CL._services.get_editing_projects(undefined, function (projects) {
		    CL.load_single_project_menu(projects[0]);
		    CL._managing_editor = true;
		});
	    });
	},
	
	get_login_url : function () { return '#'; },

	get_user_info : function (success_callback) {
		success_callback(local_services._local_user);
	},

	get_user_info_by_ids : function (ids, success_callback) {
	    var user_infos, i;
	    user_infos = {};
	    for (i = 0; i < ids.length; ++i) {
		if (ids[i] === local_services._local_user._id) {
		    user_infos[ids[i]] = local_services._local_user;
		} else {
		    user_infos[ids[i]] = { _id : ids[i], name : ids[i] };
		}
	    }
	    success_callback(user_infos);
	},
	
	show_login_status: function (callback) {
	    var elem, login_status_message;
	    elem = document.getElementById('login_status');
	    if (elem !== null) {
		elem.innerHTML = '';
		if (callback) {
		    callback();  
		}
	    }
	},

	get_editing_projects : function (criteria, success_callback) {
	    local_services._get_resource('project/' + CL._services._current_project  + '/config.json', function (project) {
		success_callback([JSON.parse(project)]);
	    });	
	},

	get_adjoining_verse : function (verse, is_previous, result_callback) {
	    return result_callback(null);
	},

	get_verse_data : function (verse, witness_list, private_witnesses, success_callback) {
	    if (private_witnesses) {
		return success_callback([], RG.calculate_lac_wits);
	    }
	    local_services._load_witnesses(verse, witness_list, function (results) {
		success_callback(results, RG.calculate_lac_wits);
	    });
	},

	// maps siglum to docid
	get_siglum_map : function (id_list, result_callback, i, siglum_map) {
	    var wit;
	    if (typeof i === 'undefined') {
		i = 0;
		siglum_map = {};
	    }
	    if (i >= id_list.length) {
		return result_callback(siglum_map);
	    }
	    local_services._get_resource('textrepo/json/'+id_list[i]+'/metadata.json', function(wit_text) {
		try {
		    wit = JSON.parse(wit_text);
		    siglum_map[wit.siglum] = id_list[i];
		}
		catch(err) {
		    siglum_map[id_list[i]] = id_list[i];
		}
		local_services.get_siglum_map(id_list, result_callback, ++i, siglum_map);
	    });
	},

	
	// get a set of rules specified by array of rule ids
	get_rules_by_ids : function(ids, result_callback, rules, i) {
	    var rule_type, resource_type;
	    if (typeof i === 'undefined') {
		rules = [];
		i = 0;
	    }
	    if (i >= ids.length) {
		return result_callback(rules);
	    }

	    rule_type = ids[i].split('_')[0];
	    resource_type = 'project/'+CL._project._id
	    	+ '/rule'
	    	+ '/' + rule_type + (rule_type === 'verse' ? ('/' + ids[i].split('_')[1]) : '')
	    	+ '/' + ids[i] + '.json';
	    local_services._get_resource(resource_type, function(rule, status) {
		if (status === 200) {
		    rules.push(JSON.parse(rule));
		}
		return local_services.get_rules_by_ids(ids, result_callback, rules, ++i);
	    });
	},
	
	//locally everything is a project so only need project rules
	get_rules : function (verse, result_callback, rules, resource_types, path_type, i) {
	    var path, rules, parsed;
	    if (typeof i === 'undefined') {
		if (typeof path_type === 'undefined') {
		    rules = [];
		    path = 'project/' + CL._project._id + '/rule/global/';
		    path_type = 'global';
		} else {
		    path = 'project/' + CL._project._id + '/rule/verse/' + verse + '/';
		    path_type = 'verse';
		}
		local_services._get_resource_children(path, function (resource_types, status) {
		    local_services.get_rules(verse, result_callback, rules, resource_types ? resource_types : [], path_type, 0);	    
		});
		return;
	    }
	    
	    if (i >= resource_types.length) {
		if (path_type === 'global') {
		    local_services.get_rules(verse, result_callback, rules, resource_types, 'verse');
		    return;
		} else {
		    return result_callback(rules);
		}
	    }
	    
	    if (resource_types[i].type === 'file') {
		if (path_type === 'global') {
		    path = 'project/' + CL._project._id + '/rule/global/';
		} else {
		    path = 'project/' + CL._project._id + '/rule/verse/' + verse + '/';
		}
		local_services._get_resource(path + resource_types[i].name, function(rule, status) {
		    rule = JSON.parse(rule);
		    //filter out any with global exceptions for this verse
		    if (!rule.hasOwnProperty('exceptions') || rule.exceptions.indexOf(verse) === -1) {
			rules.push(rule);
		    }	

		    return local_services.get_rules(verse, result_callback, rules, resource_types, path_type, ++i);
		});
	    } else {
		return local_services.get_rules(verse, result_callback, rules, resource_types, path_type, ++i);
	    }
	},

	// if verse is passed, then verse rule; otherwise global
	update_rules : function(rules, verse, success_callback) {
	    local_services.update_ruleset([], [], rules, verse, success_callback);
	},

	get_rule_exceptions : function(verse, result_callback, rules, resource_types, i) {
	    if (typeof i === 'undefined') {
		rules = [];
		local_services._get_resource_children('project/'+CL._project._id + '/rule/global/', function(resource_types, status) {
		    local_services.get_rule_exceptions(verse, result_callback, rules, resource_types, 0);
		});
		return;
	    }
	    if (i >= resource_types.length) {
		return result_callback(rules);
	    }
	    if (resource_types[i].type === 'file') {
		local_services._get_resource('project/'+CL._project._id + '/rule/global/'+resource_types[i].name, function(rule, status) {
		    rule = JSON.parse(rule);
		    if (rule.exceptions && rule.exceptions.indexOf(verse) !== -1) {
			rules.push(rule);
		    }
		    return local_services.get_rule_exceptions(verse, result_callback, rules, resource_types, ++i);
		});
	    }
	    else {
		return local_services.get_rule_exceptions(verse, result_callback, rules, resource_types, ++i);
	    }
	},

	update_ruleset : function (for_deletion, for_global_exceptions, for_addition, verse, success_callback, i, j, k) {
	    if (typeof i === 'undefined') i = 0;
	    if (typeof j === 'undefined') j = 0;
	    if (typeof k === 'undefined') k = 0;
	    if (i < for_deletion.length) {
		local_services._delete_resource(local_services._get_rule_type(for_deletion[i], verse), function () {
		    return local_services.update_ruleset(for_deletion, for_global_exceptions, for_addition, verse, success_callback, ++i, j, k);
		});
	    } else if (j < for_addition.length) {
		if (typeof for_addition[j]._id === 'undefined') {
		    for_addition[j]._id = (for_addition[j].scope === 'always' ? 'global_' : ('verse_' + verse + '_')) + U.generate_uuid();
		}
		CL._services.get_user_info(function (user) {
		    for_addition[j]._meta = { _last_modified_time : new Date().getTime(), _last_modified_by : user._id, _last_modified_by_display : user.name };
		    local_services._put_resource(local_services._get_rule_type(for_addition[j], verse), for_addition[j], function (result) {
			// we know how special we are and we always and only update a rule when we are adding an exception
			return local_services.update_ruleset(for_deletion, for_global_exceptions, for_addition, verse, success_callback, i, ++j, k);
		    });
		});
	    } else if (k < for_global_exceptions.length) {
		local_services.get_rules_by_ids([for_global_exceptions[k]._id], function (result) {
		    //we are only asking for a single rule so we can just deal with the first thing returned
		    if (result.length > 0) {
			if (result[0].hasOwnProperty('exceptions')) {
			    if (result[0].exceptions.indexOf(verse) === -1 && verse) {
				result[0].exceptions.push(verse);
			    }
			} else {
			    result[0].exceptions = [verse];
			}
			//first save the exception then continue the loop in callback
			local_services.update_ruleset([], [], [result[0]], undefined, function () {
			    return local_services.update_ruleset(for_deletion, for_global_exceptions, for_addition, verse, success_callback, i, j, ++k);
			});
		    } else {
			return local_services.update_ruleset(for_deletion, for_global_exceptions, for_addition, verse, success_callback, i, j, ++k);
		    }   
		});
	    } else if (success_callback) {
		success_callback();
	    }
	},

	// save a collation to local datastore
	save_collation : function (verse, collation, confirm_message, overwrite_allowed, no_overwrite_message, result_callback) {
	    CL._services.get_user_info(function (user) {
		var resource_type;
		resource_type = 'project/' + CL._project._id + '/user/'+user._id+'/collation/'+collation.status+'/'+verse+'.json';
		collation._meta = { _last_modified_time : { "$date" : new Date().getTime() }, _last_modified_by : user._id, _last_modified_by_display : user.name };
		collation._id = resource_type;
		local_services._get_resource(resource_type, function(result, status) {
		    // if exists
		    if (status === 200) {
			if (overwrite_allowed) {
			    var confirmed = confirm(confirm_message);
			    if (confirmed === true) {
				local_services._put_resource(resource_type, collation, function(result) {
				    return result_callback(true);
				});
			    } else {
				return result_callback(false);
			    }
			} else {
			    alert(no_overwrite_message);
			    return result_callback(false);
			}
		    } else {
			// if doesn't already exist
			local_services._put_resource(resource_type, collation, function(result) {
			    return result_callback(true);
			});
		    }
		});
	    });
	},

	get_saved_stage_ids : function (verse, result_callback) {
	    CL._services.get_user_info(function (user) {
		var r, s, o, a;
		r = null;
		s = null;
		o = null;
		a = null;
		var resource_type;
		resource_type = 'project/' + CL._project._id + '/user/'+user._id+'/collation/regularised/'+verse+'.json';
		local_services._get_resource(resource_type, function(result, status) {
		    r = (status === 200) ? resource_type : null;
		    resource_type = 'project/' + CL._project._id + '/user/'+user._id+'/collation/set/'+verse+'.json';
		    local_services._get_resource(resource_type, function(result, status) {
			s = (status === 200) ? resource_type : null;
			resource_type = 'project/' + CL._project._id + '/user/'+user._id+'/collation/ordered/'+verse+'.json';
			local_services._get_resource(resource_type, function(result, status) {
			    o = (status === 200) ? resource_type : null;
			    resource_type = 'project/' + CL._project._id + '/user/'+user._id+'/collation/approved/'+verse+'.json';
			    local_services._get_resource(resource_type, function(result, status) {
				a = (status === 200) ? resource_type : null;
				result_callback(r, s, o, a);
			    });
			});
		    });
		});
	    });
	},

	load_saved_collation: function (id, result_callback) {
	    local_services._get_resource(id, function(result, status) {
		if (result_callback) result_callback(status === 200 ? JSON.parse(result) : null);
	    });
	},
	
	get_saved_collations : function (verse, user_id, result_callback, collations, users, i) {
	    var resource_type;
	    if (typeof i === 'undefined') {
		collations = [];
		if (user_id) {
		    return get_saved_collations(verse, user_id, result_callback, collations, [{ name: user_id, type : 'dir'}], 0);
		}
		else {
		    resource_type = 'project/' + CL._project._id + '/user/';
		    local_services._get_resource_children(resource_type, function(users, status) {
			if (status === 200) {
			    return local_services.get_saved_collations(verse, user_id, result_callback, collations, users, 0);
			}
			else result_callback([]);
		    });
		    return;
		}
	    }

	    if (i >= users.length) {
		return result_callback(collations);
	    }

	    if (users[i].type === 'dir') {
		local_services._get_saved_user_collations(users[i].name, verse, function(user_collations) {
		    collations.push.apply(collations, user_collations);
		    local_services.get_saved_collations(verse, user_id, result_callback, collations, users, ++i);
		});
	    }
	    else {
		local_services.get_saved_collations(verse, user_id, result_callback, collations, users, ++i);
	    }
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
	
	//internal service functions/values
	_local_user : {
		_id: 'default',
	},
	
	_data_repo : 'http://' + SITE_DOMAIN + '/data/',
	
	_data_store_service_url : 'http://' + SITE_DOMAIN + '/datastore/',

	_get_resource : function (resource_type, result_callback) {
		var url = local_services._data_repo + resource_type + '?defeat_cache='+new Date().getTime();
		$.get(url, function(resource) {
			result_callback(resource, 200);
		}, 'text').fail(function(o) {
			result_callback(null, o.status);
		});
	},

	_put_resource : function (resource_type, resource, result_callback) {
	    var params = {
		    action : 'put',
		    resource_type : resource_type,
		    resource : JSON.stringify(resource)
	    };
	    $.post(local_services._data_store_service_url, params, function(data) {
		result_callback(200);
	    }).fail(function(o) {
		result_callback(o.status);
	    });
	},

	_delete_resource : function (resource_type, result_callback) {
	    var params = {
		    action : 'delete',
		    resource_type : resource_type
	    };
	    $.post(local_services._data_store_service_url, params, function(data) {
		result_callback(200);
	    }).fail(function(o) {
		result_callback(o.status);
	    });
	},

	// returns children for a resource, e.g.,[{ name: "resource_name", type: "file", size: n }]
	_get_resource_children : function (resource_type, result_callback) {
	    var params = {
		    action : 'list_children',
		    resource_type : resource_type
	    };
	    $.post(local_services._data_store_service_url, params, function(data) {
		result_callback(data, 200);
	    }).fail(function () { result_callback(null, 400); });
	},

	_load_witnesses : function (verse, witness_list, finished_callback, results, i) {
	    if (typeof i === 'undefined') {
		i = 0;
		results = [];
	    }
	    else if (i > witness_list.length - 1) {
		if (finished_callback) finished_callback(results);
		return;
	    }

	    var data = [];
	    local_services._get_resource('textrepo/json/' + witness_list[i] + '/' + verse + '.json', function (json, status) {
		if (status === 200) {
		    var j = JSON.parse(json);
		    var doc_wit = {
			    _id : witness_list[i] + '_' + verse,
			    context : verse,
			    tei : '',
			    siglum : j.siglum,
			    transcription_id : j.transcription_id,
			    transcription_siglum : j.transcription_siglum,
			    witnesses : j.witnesses
		    }
		    results.push(doc_wit);
		}
		local_services._load_witnesses(verse, witness_list, finished_callback, results, ++i);
	    });

	},

	_get_rule_type: function (rule, verse) {
	    return	'project/'+CL._project._id
	    + '/rule'
	    + '/' + (rule.scope == 'always' ? 'global' : ('verse/'+verse))
	    + '/' + rule._id+'.json';
	},

	_get_saved_user_collations : function(user, verse, result_callback, collations, i) {
	    var types = ['regularised', 'set', 'ordered', 'approved'];
	    if (typeof collations === 'undefined') {
		collations = [];
	    }
	    if (typeof i === 'undefined') {
		i = 0;
	    }
	    if (i >= types.length) {
		return result_callback(collations);
	    }
	    resource_type = 'project/' + CL._project._id + '/user/' + user + '/collation/' + types[i] + '/'+verse+'.json';
	    local_services._get_resource(resource_type, function(collation, status) {
		if (status === 200) {
		    collations.push(JSON.parse(collation));
		}
		return local_services._get_saved_user_collations(user, verse, result_callback, collations, ++i);
	    });
	},

};

CL.set_service_provider(local_services);
