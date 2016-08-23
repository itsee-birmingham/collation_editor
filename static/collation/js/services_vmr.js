//
// vmr_services provides an implementation which interfaces with the VMR CRE
// used by the INTF, Wuppertal, GSI, Coptic OT Project, Avestan Digital Archive
//
var vmr_services = (function() {


//
// Add Handler to listen for messages passed to us via HTML5 postMessage
// 
window.addEventListener("message", function(event) {
	if (event && event.data && event.data.msg_type == 'set_vmr_session') {
		vmr_services._set_vmr_session(event.data.vmr_session);
		vmr_services._resume_after_session_open();
	}
}, false);

// This allows us to define a separate domain for our local services
// which can be different from the domain serving up our javascript.
// You can place it anywhere before here, but I put it with SITE_DOMAIN in sitedomain.js
if (typeof LOCAL_SERVICES_DOMAIN === 'undefined') LOCAL_SERVICES_DOMAIN = SITE_DOMAIN;


// private static properties
	var _vmr_api = 'http://ntvmr.uni-muenster.de/community/vmr/api/';
	var _data_store_service_url = _vmr_api + 'projectmanagement/project/data/';

// public vmr_services methods
return {
	set_vmr_services : function (rootURL) {
		_vmr_api = rootURL;
		if (typeof VMRCRE !== 'undefined') VMRCRE.servicesURL = _vmr_api;
		_data_store_service_url = _vmr_api + 'projectmanagement/project/data/';
	},
	local_javascript : [
		(SITE_DOMAIN.length < 4 || SITE_DOMAIN.substring(0,4) !== 'http' ? 'http://' : '') + SITE_DOMAIN + '/collation/js/menus.js',
		(SITE_DOMAIN.length < 4 || SITE_DOMAIN.substring(0,4) !== 'http' ? 'http://' : '') + SITE_DOMAIN + '/collation/js/magpy_functions.js'
	],

	_vmr_session : typeof VMR !== 'undefined' ? VMR.getSessionHash() : null,
	_resume_after_session_callback : null,
	_resume_after_session_param1 : null,
	_resume_after_session_param2 : null,
	_resume_after_session_param3 : null,
	_user : -1,
	_last_transcription_siglum_map : null,
	_last_private_transcription_siglum_map : null,

	_set_vmr_session : function (vmr_session) {
		vmr_services._vmr_session = vmr_session;
	},

	_resume_after_session_open : function () {
		return vmr_services._resume_after_session_callback(vmr_services._resume_after_session_param1, vmr_services._resume_after_session_param2, vmr_services._resume_after_session_param3);
	},
	_make_private_witness : function (witness) {
		witness.siglum += '_' + vmr_services._user._id;
		for (var j = 0; witness.witnesses && j < witness.witnesses.length; ++j) {
			witness.witnesses[j].id = witness.witnesses[j].id + '_' + vmr_services._user._id;
			for (var k = 0; k < witness.witnesses[j].tokens.length; ++k) {
				witness.witnesses[j].tokens[k].siglum = witness.witnesses[j].tokens[k].siglum + '_' + vmr_services._user._id;
			}
		}
	},

	_get_resource : function (resource_type, id, user, result_callback) {
		var params = {
			sessionHash : vmr_services._vmr_session,
			format      : 'json',
			projectName : vmr_services._project.project,
			userName    : (user?user:vmr_services._user._id),
			key         : resource_type
		};
		if (id) {
			params.subKey = id;
		}

		$.post(_data_store_service_url+'get/', params, function (resource) {
			// assert we have a result
			if (resource == null)                return result_callback(null, -1);
			// if we were passed a set of keys, then simply return the array result
			if (resource_type.indexOf('|') > -1) return result_callback(resource, 200);
			// if we were passed only 1 key and have only 1 result, return the result;
			// otherwise, return the array.
			// Slight cheese, but even if we saved an array object with one entry,
			// we should get back [[{...}]], so we should be OK.
			result_callback((resource.length == 1)?resource[0]:resource, 200);
		}).fail(function(o) {
			result_callback(null, o.status);
		});
	},

	_put_resource : function (resource_type, id, resource, result_callback) {
		var params = {
			sessionHash : vmr_services._vmr_session,
			projectName : vmr_services._project.project,
			userName    : vmr_services._user._id,
			key         : resource_type,
			data        : JSON.stringify(resource)
		};
		if (id) {
			params.subKey = id;
		}
		$.post(_data_store_service_url+'put/', params, function(data) {
			result_callback(200);
		}).fail(function(o) {
console.log('*** Error: _put_resource failed.');
			result_callback(o.status);
		});
	},

	_delete_resource : function (resource_type, id, result_callback) {
		vmr_services._put_resource(resource_type, id, null, result_callback);
	},

	_delete_regularization_rule(rule, result_callback) {
		var params = {
			sessionHash : vmr_services._vmr_session,
			regID       : rule._id,
		};
		$.post(_vmr_api+'regularization/delete/', params, function(data) {
			if ($(data).find('error').length > 0) {
console.log('*** Error: _delete_regularization_rule failed.');
				alert($(data).find('error').attr('message'));
				result_callback(-1);
			}
			else {
				result_callback(200);
			}
		}).fail(function(o) {
			result_callback(o.status);
		});
	},

	_save_regularization_rule(rule, result_callback) {
		rule._meta = {
			_last_modified_time : new Date().getTime(),
			_last_modified_by : vmr_services._user._id,
			_last_modified_by_display : vmr_services._user.name
		};
		var params = {
			sessionHash : vmr_services._vmr_session,
			groupName   : vmr_services._project.project,
			userName    : vmr_services._user._id,
			visibility  : 'Public',
			sourceWord  : rule.t,
			targetWord  : rule.n,
			type        : rule.class
		};
		if (rule.scope == 'verse') {
			params.scope = 'Verse';
			params.verse = rule.context.unit;
		}
		else {
			params.scope = 'Global';
		}
		if (rule.comments) {
			params.comment = rule.comments;
		}
		params.options = "";
		if (rule.conditions) {
			var opts = [];
			if (rule.conditions.ignore_supplied) opts.push('IGNORE_SUPPLIED');
			if (rule.conditions.ignore_unclear) opts.push('IGNORE_UNCLEAR');
			if (rule.conditions.only_nomsac) opts.push('ONLY_NOMSAC');
			params.options = opts.join('|');
		}
		$.post(_vmr_api+'regularization/put/', params, function(data) {
			if ($(data).find('error').length > 0) {
console.log('*** Error: _save_regularization_rule failed.');
				alert($(data).find('error').attr('message'));
				result_callback(-1);
			}
			else {
				rule._id = $(data).attr('regID');
				result_callback(200);
			}
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
	    $.post(_data_store_service_url, params, function(data) {
		result_callback(data, 200);
	    }).fail(function () { result_callback(null, 400); });
	},

	_load_projects(project_names, result_callback) {
		var params = {
			sessionHash : vmr_services._vmr_session,
			projectName : project_names.join('|'),
			detail : 'tasks'
		};
		$.post(_vmr_api+'projectmanagement/project/get/', params, function(data) {
			var projs = [];
			$(data).find('project').each(function() {
				var projectConfig = null;
				try {
					projectConfig = $.parseJSON($(this).find('configuration').text());
				} catch (err) {}
				var p = $.extend(true, {}, vmr_services._project_default);
				if (projectConfig) $.extend(true, p, projectConfig);
				if (typeof baseTextDocID !== 'undefined' && baseTextDocID) p.base_text = baseTextDocID;
				p._id = $(this).attr('name');
				p.project = p._id;
				p.book_name = $(this).attr('objectPart');
				p.book = p.book_name;
				p.managing_editor = vmr_services._user._id;
				p.editors = [];
				$(this).find('userGroup > user').each(function() {
					p.editors.push($(this).text());
				});
				p.witnesses = [p.base_text];
				$(this).find('documentGroup > documents > document').each(function() {
					p.witnesses.push($(this).attr('docID'));
				});
				projs.push(p);
			})

			result_callback(projs);
		}).fail(function () {
console.log('*** failed: _load_projects');
			result_callback(null);
		});
	},

	_get_available_projects(result_callback) {
		var params = {
			sessionHash : vmr_services._vmr_session,
			userName : vmr_services._user._id
		};
		$.post(_vmr_api+'projectmanagement/usergroup/get/', params, function(data) {
			var projNames = [];
			$(data).find('project').each(function() {
				projNames.push($(this).attr('name'));
			});
			result_callback(projNames);
		}).fail(function () {
console.log('*** failed: _get_available_projects');
			result_callback([]);
		});
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
		var resource_type = 'collation/' + types[i] + '/'+verse;
		vmr_services._get_resource(resource_type, null, user, function(collation, status) {
			if (status === 200 && collation) {
				collations.push(collation);
			}
			return vmr_services._get_saved_user_collations(user, verse, result_callback, collations, ++i);
		});
	},

	supported_rule_scopes: {
//		'once'      : 'This place, these MSS', 
		'verse'     : 'This verse, all MSS', 
//		'manuscript': 'Everywhere, these MSS', 
		'always'    : 'Everywhere, all MSS'
	},

//	get_login_url : function () { return 'http://ntvmr.uni-muenster.de/community/vmr/api/auth/session/open/form?redirURL=http://'+SITE_DOMAIN + '/collation/'; },
	get_login_url : function () { return (typeof VMR !== 'undefined') ? VMR.httpRoot : 'http://ntvmr.uni-muenster.de'; },
	get_user_info : function (success_callback) {

		if (vmr_services._user != -1) return success_callback(vmr_services._user);

		if (vmr_services._vmr_session == null) {
			vmr_services._resume_after_session_callback = vmr_services.get_user_info;
			vmr_services._resume_after_session_param1 = success_callback;
			var ifr = document.createElement('IFRAME');
			ifr.src = _vmr_api + "auth/session/check?ir=parent.postMessage({'msg_type':'set_vmr_session','vmr_session':'{s}'}, '*')";
			ifr.style.display = 'none';
			document.body.appendChild(ifr);
			return;
		}
		
		var data = {'sessionHash' : vmr_services._vmr_session };
		$.get(_vmr_api + 'auth/session/check/', data, function(xml) {
			var user = {};
			if (!$(xml).find('error').length) {
				user._id = $(xml).find('user').attr('userName');
				user.email = $(xml).find('emailAddress').text();
				user.first_name = $(xml).find('firstName').text();
				user.last_name = $(xml).find('lastName').text();
				user.locale = 'en';
				user.name = $(xml).find('fullName').text();
			}
			else user = null;
			vmr_services._user = user;
			success_callback(user);
		}).fail(function(o) {
			success_callback(null);
		});
	},
	
	show_login_status: function (callback) {
	    var elem, login_status_message;
	    elem = document.getElementById('login_status');
	    if (elem !== null) {
		CL._services.get_user_info(function (response) {
		    if (response) {		    
				login_status_message = 'logged in as ' + response.name;
			    elem.innerHTML = login_status_message;
		    } else {
		    	elem.innerHTML = '<br/><a href="'+CL._services.get_login_url()+'">login</a>';
		    }
		    if (callback) callback();
		});
	    }
	},

	_switch_project_dialog : $(`
		<div>
			<p>Choose Project: <select id="project_selection">
				<option></option>
			</select></p>
			<button id="load_project">Load</button>
		</div>`
	),

	// this sets up the switch project functionality
	// it does not actually switch projects
	switch_project : function () {	    
		var d = vmr_services._switch_project_dialog;
		$(d).dialog({
			autoOpen: false,
			title: 'Choose Project',
			beforeClose : function() {
				return vmr_services._project && vmr_services._project._id.length > 0;
			}
		});
		$('#load_project').off('click.load_project');
		$('#load_project').on('click.load_project', function() {
			vmr_services._load_projects([$('#project_selection').val()], function(p) {
				if (p && p.length) {
					vmr_services._project = p[0];
					CL._managing_editor = true;
					$(d).dialog('close');
					CL.load_single_project_menu(p[0]);
				}
			});
		});
		$('#switch_project_button').off('click.switch_project');
		$('#switch_project_button').on('click.switch_project', vmr_services._switch_project);
	},

	// this actually initiates the switch project procedure
	_switch_project : function() {
		var d = vmr_services._switch_project_dialog;
		$(d).dialog({
			autoOpen: false,
			title: 'Choose Project'
		});
		CL._services.get_user_info(function (user) {
			if (user) {
				vmr_services._get_available_projects(function(projects) {
					var t = '<option>' + projects.join('</option><option>') + '</option>';
					$('#project_selection').html(t);
					if (vmr_services._project) {
						$('#project_selection').val(vmr_services._project._id);
					}
					$(d).dialog('open');
				});
			}
		});
	},

	get_editing_projects : function (criteria, success_callback) {
		vmr_services._get_available_projects(function(projects) {
			vmr_services._load_projects(projects, function(p) {
				success_callback(p);
			});
		});
	},
	isAdmin : typeof VMR === 'undefined' ? false : VMR.isAdmin,
	initialise_editor : function () {
		// start with something defaulted
		vmr_services._project = $.extend(true, {}, vmr_services._project_default);
		if (typeof baseTextDocID !== 'undefined' && baseTextDocID) vmr_services._project.base_text = baseTextDocID;

		var criteria;
		CL._services.show_login_status(function() {
			if (typeof output !== 'undefined') {
				CL._display_mode = output;
			}
			CL._container = document.getElementById('container');
			CL._services.get_user_info(function (user) {	// success
				if (user) {
					criteria = {'editors' : {'$in' : [user._id]}};

					// TODO: there are still 3 MAG calls in the menus.js
					// so we can't use this.  Use our switch_project function instead
					
					//MENU.choose_menu_to_display(user, criteria, 'collation');
					
					if (typeof VMR === 'undefined' || typeof VMR.siteName === 'undefined') {
						CL.load_single_project_menu(vmr_services._project);
						vmr_services._switch_project();
					}
					else {
						vmr_services._load_projects([VMR.siteName], function(p) {
							if (p && p.length) {
								vmr_services._project = p[0];
								CL._managing_editor = vmr_services.isAdmin;
								CL.load_single_project_menu(p[0]);
							}
						});
					}
				}
				else {		// failure
					CL._container.innerHTML = '<p>Please login using the link in the top right corner to use the editing interface</p>';
				}
			});
		});
	},

	get_adjoining_verse : function (verse, is_previous, result_callback) {
		$.post(_vmr_api + "metadata/v11n/parse/", { text : verse, intros : false, step : is_previous ? -1 : 1 }, function (result) {
			return result_callback($(result).find('verse').attr('osisID'));
		});
	},

	get_verse_data : function (verse, witness_list, private_witnesses, success_callback) {
		var url, options;
		options = {};
		url = _vmr_api + "transcript/get/";
		
		options = {'sessionHash' : vmr_services._vmr_session, 'format': 'wce', 'indexContent': verse, 'docID': witness_list.join('|')};
		if (typeof transcriptionUser !== 'undefined' && transcriptionUser) options.userName = transcriptionUser;
		if (private_witnesses) options.userName = vmr_services._user._id;

		$.post(url, options, function (result) {

			if (private_witnesses) vmr_services._last_private_transcription_siglum_map = new Map();
			else vmr_services._last_transcription_siglum_map = new Map();

			var collate_data = result;
			
			// just clear out private_witnesses for now until we get things working for public witnesses
			if (private_witnesses) collate_data = [];

			for (var i = 0; i < collate_data.length; ++i) {
				var w = collate_data[i];
				w.transcription_siglum = w.siglum;
				(private_witnesses?vmr_services._last_private_transcription_siglum_map:vmr_services._last_transcription_siglum_map).set(w.document_id, w.siglum);
				if (private_witnesses) vmr_services._make_private_witness(w);
			}
			success_callback(collate_data, RG.calculate_lac_wits);

		}).fail(function(o) {
			success_callback([], RG.calculate_lac_wits);
		});
	},

	get_siglum_map : function (id_list, result_callback) {
		if (id_list.length) {
			$.post(_vmr_api + "metadata/liste/search/", { docID : id_list.join('|'), detail : 'document' }, function (result) {
				var siglum_map = {};
				$(result).find('manuscript').each(function() {
					siglum_map[$(this).attr('gaNum')] = $(this).attr('docID');
				});
				result_callback(siglum_map);
			});
		}
		else result_callback({});
	},

	


	update_rules : function(rules, verse, success_callback) {
		var eachRule = function(origs, rules, finished_callback, i) {
			if (!i) i = 0;
			if (i >= rules.length) return finished_callback();

			// be sure we're simply deleting an exeception
			if (origs[i].exceptions && (!rules[i].exceptions || rules[i].exceptions.length < origs[i].exceptions.length)) {
				var params = {
					sessionHash : vmr_services._vmr_session,
					groupName   : vmr_services._project.project,
					userName    : vmr_services._user._id,
					verse       : verse,
					regID       : rules[i]._id
				};
				$.post(_vmr_api+'regularization/deleteexception/', params, function(data) {
					if ($(data).find('error').length > 0) {
console.log('*** Error: _delete_regularization_rule_exception error.');
						alert($(data).find('error').attr('message'));
					}
					return eachRule(origs, rules, finished_callback, ++i);
				}).fail(function(o) {
console.log('*** Error: _delete_regularization_rule_exception failed.');
					return eachRule(origs, rules, finished_callback, ++i);
				});
			}
			else {
				alert('we have been called to update a rule which is not a simple removal of exception');
				return eachRule(origs, rules, finished_callback, ++i);
			}
		};

		var ids = [];
		for (var i = 0; i < rules.length; ++i) { ids.push(rules[i]._id); }
		vmr_services.get_rules_by_ids(ids, function(origs) {
			eachRule(origs, rules, success_callback);
		});
	},

	get_rules_by_ids : function(ids, result_callback, rules, i) {

		if (!i) { rules = []; i = 0; }
		if (i >= ids.length) return result_callback(rules);

		var params = {
			sessionHash : vmr_services._vmr_session,
			indexContext : CL._context,
			regID : ids[i]
		};

		$.post(_vmr_api+'regularization/get/', params, function(data) {
			if ($(data).find('error').length > 0) {
				alert ($(data).find('error').attr('message'));
				return result_callback(rules);
			}
			$(data).find('regularization').each(function() {
				var rule = {
					_id : $(this).attr('regID'),
					_model: 'decision',
					_meta : {
						_last_modified_time : new Date().getTime(),
						_last_modified_by : $(this).attr('userID'),
						_last_modified_by_display : $(this).attr('userID')
					},
					active : true,
					type : 'regularisation',
					project : $(this).attr('group'),
					t : $(this).find('sourceWord').text(),
					n : $(this).find('targetWord').text(),
					'class' : $(this).attr('type').toLowerCase(),
				}
				if ($(this).attr('scope') == 'Global') {
					rule.scope = 'always';
					rule.context = {};
				}
				else {
					rule.scope = 'verse';
					rule.context = { unit : $(this).attr('contextVerse') };
				}
				if ($(this).find('comment').length) {
					rule.comments = $(this).find('comment').text();
				}
				if ($(this).attr('optionsCodes')) {
					rule.conditions = {};
					var codes = $(this).attr('optionsCodes').split('|');
					if (codes.indexOf('IGNORE_SUPPLIED') > -1) rule.conditions.ignore_supplied = true;
					if (codes.indexOf('IGNORE_UNCLEAR') > -1) rule.conditions.ignore_unclear = true;
					if (codes.indexOf('ONLY_NOMSAC') > -1) rule.conditions.only_nomsac = true;
				}
				if ($(this).find('verseException').length) {
					rule.exceptions = [];
					$(this).find('verseException').each(function() {
						rule.exceptions.push($(this).attr('verse'));
					});
				}
				rules.push(rule);
			});
			return vmr_services.get_rules_by_ids(ids, result_callback, rules, ++i);
		}).fail(function(o) {
			console.log('*** failed: vmr_services.get_rules_by_id');
			result_callback(rules);
		});
	},

	get_rules : function (verse, result_callback) {
		var params = {
			sessionHash : vmr_services._vmr_session,
			includeGlobals : true,
			indexContext : verse
		};
		$.post(_vmr_api+'regularization/get/', params, function(data) {
			if ($(data).find('error').length > 0) {
				alert ($(data).find('error').attr('message'));
				return result_callback([]);
			}
			var rules = [];
			$(data).find('regularization').each(function() {
				var rule = {
					_id : $(this).attr('regID'),
					_model: 'decision',
					_meta : {
						_last_modified_time : new Date().getTime(),
						_last_modified_by : $(this).attr('userID'),
						_last_modified_by_display : $(this).attr('userID')
					},
					active : true,
					type : 'regularisation',
					project : $(this).attr('group'),
					t : $(this).find('sourceWord').text(),
					n : $(this).find('targetWord').text(),
					'class' : $(this).attr('type').toLowerCase(),
				}
				if ($(this).attr('scope') == 'Global') {
					rule.scope = 'always';
					rule.context = {};
				}
				else {
					rule.scope = 'verse';
					rule.context = { unit : $(this).attr('contextVerse') };
				}
				if ($(this).find('comment').length) {
					rule.comments = $(this).find('comment').text();
				}
				if ($(this).attr('optionsCodes')) {
					rule.conditions = {};
					var codes = $(this).attr('optionsCodes').split('|');
					if (codes.indexOf('IGNORE_SUPPLIED') > -1) rule.conditions.ignore_supplied = true;
					if (codes.indexOf('IGNORE_UNCLEAR') > -1) rule.conditions.ignore_unclear = true;
					if (codes.indexOf('ONLY_NOMSAC') > -1) rule.conditions.only_nomsac = true;
				}
				if ($(this).find('verseException').length) {
					rule.exceptions = [];
					$(this).find('verseException').each(function() {
						rule.exceptions.push($(this).attr('verse'));
					});
				}
				rules.push(rule);
			});
			return result_callback(rules);
		}).fail(function(o) {
			console.log('*** failed: vmr_services.get_rules');
			result_callback([]);
		});
	},

	get_rule_exceptions : function(verse, result_callback, rules, resource_types, i) {
		vmr_services.get_rules(verse, function(rules) {
			var exceptions = [];
			for (var i = 0; i < rules.length; ++i) {
				if (rules[i].exceptions && rules[i].exceptions.indexOf(verse) > -1) exceptions.push(rules[i]);
			}
			result_callback(exceptions);
		});
	},

	update_ruleset : function (for_deletion, for_global_exceptions, for_addition, verse, success_callback, i, j, k) {
		if (typeof i === 'undefined') i = 0;
		if (typeof j === 'undefined') j = 0;
		if (typeof k === 'undefined') k = 0;
		if (i < for_deletion.length) {
			vmr_services._delete_regularization_rule(for_deletion[i], function () {
				return vmr_services.update_ruleset(for_deletion, for_global_exceptions, for_addition, verse, success_callback, ++i, j, k);
			});
		}
		else if (j < for_addition.length) {
			vmr_services._save_regularization_rule(for_addition[j], function(status) {
				// we know how special we are and we always and only update a rule when we are adding an exception
				return vmr_services.update_ruleset(for_deletion, for_global_exceptions, for_addition, verse, success_callback, i, ++j, k);
			});
		}
		else if (k < for_global_exceptions.length) {
			var rule = for_global_exceptions[k];
			rule._meta = {
				_last_modified_time : new Date().getTime(),
				_last_modified_by : vmr_services._user._id,
				_last_modified_by_display : vmr_services._user.name
			};
			var params = {
				sessionHash : vmr_services._vmr_session,
				groupName   : vmr_services._project.project,
				userName    : vmr_services._user._id,
				verse       : verse,
				regID       : rule._id
			};
			$.post(_vmr_api+'regularization/addexception/', params, function(data) {
				if ($(data).find('error').length > 0) {
console.log('*** Error: _save_regularization_rule_exception failed.');
					alert($(data).find('error').attr('message'));
					result_callback(-1);
				}
				else {
					return vmr_services.update_ruleset(for_deletion, for_global_exceptions, for_addition, verse, success_callback, i, j, ++k);
				}
			}).fail(function(o) {
				result_callback(o.status);
			});
		}
		else if (success_callback) {
			success_callback();
		}
	},
	save_collation : function (verse, collation, confirm_message, overwrite_allowed, no_overwrite_message, result_callback) {
	    CL._services.get_user_info(function (user) {
		var key = 'collation/'+collation.status+'/'+verse;
		collation._meta = { _last_modified_time : { "$date" : new Date().getTime() }, _last_modified_by : user._id, _last_modified_by_display : user.name };
		collation._id = vmr_services._user._id+'/'+key;
		vmr_services._get_resource(key, null, null, function(result, status) {
		    // if exists
		    if (status == 200 && result) {
			if (overwrite_allowed) {
			    var confirmed = confirm(confirm_message);
			    if (confirmed === true) {
				vmr_services._put_resource(key, null, collation, function(result) {
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
			vmr_services._put_resource(key, null, collation, function(result) {
			    return result_callback(true);
			});
		    }
		});
	    });
	},
	get_saved_stage_ids : function (verse, result_callback) {
		var keys = [
			'collation/regularised/'+verse,
			'collation/set/'+verse,
			'collation/ordered/'+verse,
			'collation/approved/'+verse
		];
		vmr_services._get_resource(keys.join('|'), null, null, function(result, status) {
			if (status != 200) {
				console.log('*** Error: get_saved_stage_ids failed.');
				return result_callback(null, null, null, null);
			}
			result_callback(result[0], result[1], result[2], result[3]);
		});
	},

	get_saved_collations : function (verse, user_id, result_callback, collations, users, i) {
		var resource_type;
		if (typeof i === 'undefined') {
			collations = [];
			if (user_id) {
				return vmr_services.get_saved_collations(verse, user_id, result_callback, collations, [user_id], 0);
			}
			else {
				return vmr_services.get_saved_collations(verse, user_id, result_callback, collations, vmr_services._project.editors, 0);
			}
		}

		if (i >= users.length) {
			return result_callback(collations);
		}

		vmr_services._get_saved_user_collations(users[i], verse, function(user_collations) {
			collations.push.apply(collations, user_collations);
			vmr_services.get_saved_collations(verse, user_id, result_callback, collations, users, ++i);
		});
	},

	get_user_info_by_ids : function (ids, success_callback, user_infos, i) {
		if (typeof i === "undefined") i = 0;
		if (!i) user_infos = {};

		if (i >= ids.length) return success_callback(user_infos);

		if (vmr_services._user && vmr_services._user._id && ids[i] == vmr_services._user._id) {
			user_infos[ids[i]] = vmr_services._user;
			return vmr_services.get_user_info_by_ids(ids, success_callback, user_infos, ++i);
		}
		else {
			var params = {
				sessionHash : vmr_services._vmr_session,
				userName : ids[i] 
			};
			$.post(_vmr_api+'projectmanagement/user/get/', params, function(xml) {
				if ($(xml).find('error').length > 0) {
console.log('*** Error: user/get failed.');
					return vmr_services.get_user_info_by_ids(ids, success_callback, user_infos, ++i);
				}
				var user = {};
				user._id = $(xml).find('user').attr('userName');
				user.email = $(xml).find('emailAddress').text();
				user.first_name = $(xml).find('firstName').text();
				user.last_name = $(xml).find('lastName').text();
				user.locale = 'en';
				user.name = $(xml).find('fullName').text();
				user_infos[ids[i]] = user;
				return vmr_services.get_user_info_by_ids(ids, success_callback, user_infos, ++i);
			}).fail(function () {
console.log('*** failed: user/get');
				return vmr_services.get_user_info_by_ids(ids, success_callback, user_infos, ++i);
			});
		}
	},
	load_saved_collation: function (id, result_callback) {
		if (id.split) {
			var idSegs = id.split('/');
			var user = null;
			var rev = null;
			if (idSegs[0] != 'collation') {
				user = idSegs[0];
				idSegs.shift();
				if (idSegs[0] != 'collation') {
					rev = idSegs[0];
					idSegs.shift();
				}
			}
			vmr_services._get_resource(idSegs.join('/'), null, user, function(result, status) {
				result_callback(result);
			});
		}
		// TODO: sometimes we're called with the actual collation object, not an ID. Is this OK?
		else {
			result_callback(id);
		}
	},


	do_collation : function(verse, options, result_callback) {
	    var url;
	    if (typeof options === "undefined") {
		options = {};
	    }
	    url = LOCAL_SERVICES_DOMAIN;
            if (url.length < 4 || url.substring(0,4) !== 'http') url = 'http://'+LOCAL_SERVICES_DOMAIN;
	    url += '/vmrcre_collation.jsp';
	    if (options.hasOwnProperty('accept')) {
		url += options.accept;
	    }    
	    $.post(url, { options : JSON.stringify(options) }, function(data) {
		if (data) {
			result_callback(data);
		}
		else {
			alert('no data was returned from collation.');
			SPN.remove_loading_overlay();
		}
	    }).fail(function(o) {
		alert('there was a problem with collation or post processing.');
        	SPN.remove_loading_overlay();
	    });
	},

	get_apparatus_for_context: function (success_callback) {
		var url;
		url = LOCAL_SERVICES_DOMAIN;
		if (url.length < 4 || url.substring(0,4) !== 'http') url = 'http://'+LOCAL_SERVICES_DOMAIN;
		url += '/vmrcre_collation.jsp';
		$.fileDownload(url, {httpMethod: "POST", 
			data: { options : JSON.stringify({
				settings: JSON.stringify(CL.get_exporter_settings()),
				format: 'negative_xml',
				data: JSON.stringify([{"context": CL._context, "structure": CL._data}])
			})},
			successCallback: function () {
				if (success_callback) {
					success_callback();
				}
			}
			//can also add a failCallback here if you want
		});
	},

	_project : null,

	_context_input_form_onload: function() {
		VMRCRE.context_input_form_onload(function() {
			$('#bookselect').val(vmr_services._project.book);
			$('#bookselect').trigger('change');
		});
	},

	_project_default : {
			_id: '',
			project: '',
			V_for_supplied: true,
			collation_source: 'WCE',
			book_name: 'Matthew',
			language: 'grc',
			book:'mt',
			base_text:'1002800',
			local_js_file : ['/collation/js/vmrcre_functions.js'],
			context_input : {
				'form': 'vmrcre_verse_selector.html', 
				'onload_function': 'vmr_services._context_input_form_onload', 
				'result_provider': 'VMRCRE.get_context_from_input_form'
			},
			managing_editor:'tagriffitts',
			editors:['tagriffitts', 'cat', "4fec7b934a64b14976000001","4ff15e524a64b14976000006"],


	"local_python_implementations": {
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
	"exporter_settings": {
//		"python_file": "collation.ecm_exporter",
//		"python_file": "collation.nt_exporter",
		"python_file": "collation.exporter",
//		"class_name": "ECMExporter",
//		"class_name": "NTExporter",
		"class_name": "Exporter",
		"function": "export_data"
	},
    "regularisation_classes": [
        {
            "name": "None",
            "linked_appendix": false,
            "keep_as_main_reading": false,
            "create_in_SV": false,
            "suffixed_label": false,
            "value": "none",
            "suffixed_reading": false,
            "create_in_RG": true,
            "create_in_OR": true,
            "subreading": false,
            "suffixed_sigla": false
        },
        {
            "name": "Reconstructed",
            "linked_appendix": false,
            "keep_as_main_reading": false,
            "create_in_SV": true,
            "suffixed_label": false,
            "value": "reconstructed",
            "suffixed_reading": false,
            "create_in_RG": false,
            "create_in_OR": true,
            "subreading": false,
            "identifier": "V",
            "suffixed_sigla": true
        },
        {
            "name": "Orthographic",
            "linked_appendix": false,
            "keep_as_main_reading": false,
            "create_in_SV": true,
            "suffixed_label": true,
            "value": "orthographic",
            "suffixed_reading": false,
            "create_in_RG": true,
            "create_in_OR": true,
            "subreading": true,
            "identifier": "o",
            "suffixed_sigla": false
        },
        {
            "name": "Regularised",
            "linked_appendix": false,
            "keep_as_main_reading": false,
            "create_in_SV": true,
            "RG_default": true,
            "value": "regularised",
            "suffixed_reading": false,
            "create_in_RG": true,
            "suffixed_label": false,
            "subreading": false,
            "create_in_OR": true,
            "identifier": "r",
            "suffixed_sigla": true
        },
        {
            "name": "Abbreviation",
            "linked_appendix": false,
            "keep_as_main_reading": false,
            "create_in_SV": true,
            "suffixed_label": false,
            "value": "abbreviation",
            "suffixed_reading": false,
            "create_in_RG": true,
            "create_in_OR": true,
            "subreading": false,
            "suffixed_sigla": false
        }
    ],
	witnesses:["1002800", "20001"]
}
};})();

CL.set_service_provider(vmr_services);
