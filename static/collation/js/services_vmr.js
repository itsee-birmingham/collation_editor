//
// vmr_services provides an implementation which interfaces with the VMR CRE
// used by the INTF, Wuppertal, GSI, Coptic OT Project, Avestan Digital Archive
//



//
// Add Handler to listen for messages passed to us via HTML5 postMessage
// 

window.addEventListener("message", function(event) {
	if (event && event.data && event.data.msg_type == 'set_vmr_session') {
		vmr_services._set_vmr_session(event.data.vmr_session);
		vmr_services._resume_after_session_open();
	}
}, false);


var vmr_services = {
	_vmr_api : 'http://ntvmr.uni-muenster.de/community/vmr/api/',
	_vmr_session : null,
	_resume_after_session_callback : null,
	_resume_after_session_param1 : null,
	_resume_after_session_param2 : null,
	_resume_after_session_param3 : null,
	_user : -1,
	_last_transcription_xml : null,
	_last_private_transcription_xml : null,

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
	supported_rule_scopes: {'once': 'This place, these MSS', 'always': 'Everywhere, all MSS'},
	get_login_url : function () { return 'http://ntvmr.uni-muenster.de/community/vmr/api/auth/session/open/form?redirURL=http://'+SITE_DOMAIN + '/collation/'; },
	get_user_info : function (success_callback) {

		if (vmr_services._user != -1) return success_callback(vmr_services._user);

		if (vmr_services._vmr_session == null) {
			vmr_services._resume_after_session_callback = vmr_services.get_user_info;
			vmr_services._resume_after_session_param1 = success_callback;
			var ifr = document.createElement('IFRAME');
			ifr.src = "http://ntvmr.uni-muenster.de/community/vmr/api/auth/session/check?ir=parent.postMessage({'msg_type':'set_vmr_session','vmr_session':'{s}'}, '*')";
			ifr.style.display = 'none';
			document.body.appendChild(ifr);
			return;
		}
		
		var data = {'sessionHash' : vmr_services._vmr_session };
		$.get(vmr_services._vmr_api + 'auth/session/check/', data, function(xml) {
			var user = {};
			if (!$(xml).find('error').length) {
				user._id = $(xml).find('user').attr('userName');
				user.email = $(xml).find('emailAddress').text();
				user.first_name = $(xml).find('firstName').text();
				user.last_name = $(xml).find('lastName').text();
				user.locale = 'en';
				user.name = user.first_name;
				var mn = $(xml).find('middleName').text();
				if (mn.length) user.name += ' ' + mn;
				user.name += ' ' + user.last_name;
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

	get_editing_projects : function (criteria, success_callback) {
		var project = {
			project:"ECM",
			V_for_supplied: true,
			collation_source: 'WCE',
			book_name: 'John',
			language: 'grc',
			book:'jn',
			base_text:'1002800',
			_id:'vmr_john',
			local_js_file : ['/collation/js/vmrcre_functions.js'],
			context_input : {
				'form': 'vmrcre_verse_selector.html', 
				'onload_function': 'VMRCRE.context_input_form_onload', 
				'result_provider': 'VMRCRE.get_context_from_input_form'
			},
			managing_editor:'tagriffitts',
			editors:['tagriffitts', 'cat', "4fec7b934a64b14976000001","4ff15e524a64b14976000006"],
			witnesses:["1002800", "20001","20002", "20003", "20004", "20005", "20006", "20007"],
			regularisation_classes:[{"linked_appendix":false,"keep_as_main_reading":false,"name":"None","create_in_SV":false,"suffixed_label":false,"value":"none","suffixed_reading":false,"create_in_RG":true,"create_in_OR":true,"subreading":false,"suffixed_sigla":false},{"linked_appendix":false,"keep_as_main_reading":false,"name":"Reconstructed","create_in_SV":true,"suffixed_label":false,"value":"reconstructed","suffixed_reading":false,"create_in_RG":false,"create_in_OR":true,"subreading":false,"identifier":"V","suffixed_sigla":true},{"linked_appendix":false,"keep_as_main_reading":false,"name":"Orthographic","create_in_SV":true,"suffixed_label":true,"value":"orthographic","suffixed_reading":false,"create_in_RG":true,"create_in_OR":true,"subreading":true,"identifier":"o","suffixed_sigla":false},{"linked_appendix":false,"keep_as_main_reading":false,"name":"Regularised","create_in_SV":true,"RG_default":true,"value":"regularised","suffixed_reading":false,"create_in_RG":true,"suffixed_label":false,"subreading":false,"create_in_OR":true,"identifier":"r","suffixed_sigla":true},{"linked_appendix":false,"keep_as_main_reading":false,"name":"Abbreviation","create_in_SV":true,"suffixed_label":false,"value":"abbreviation","suffixed_reading":false,"create_in_RG":true,"create_in_OR":true,"subreading":false,"suffixed_sigla":false},{"linked_appendix":false,"keep_as_main_reading":false,"name":"Partly Lacunose","create_in_SV":true,"suffixed_label":false,"value":"partly_lacunose","suffixed_reading":false,"create_in_RG":false,"create_in_OR":true,"subreading":false,"suffixed_sigla":false},{"linked_appendix":false,"keep_as_main_reading":false,"name":"Fix me Later","create_in_SV":false,"suffixed_label":false,"value":"fix_me_later","suffixed_reading":false,"create_in_RG":true,"create_in_OR":false,"subreading":true,"identifier":"FML","suffixed_sigla":true},{"linked_appendix":false,"keep_as_main_reading":true,"name":"Lectionary Influence","create_in_SV":false,"suffixed_label":false,"value":"lectionary_influence","suffixed_reading":true,"create_in_RG":false,"create_in_OR":true,"subreading":false,"identifier":"Λ","suffixed_sigla":false},{"linked_appendix":false,"keep_as_main_reading":true,"name":"Commentary Influence","create_in_SV":false,"suffixed_label":false,"value":"commentary_influence","suffixed_reading":true,"create_in_RG":false,"create_in_OR":true,"subreading":false,"identifier":"CI","suffixed_sigla":false}],
		};
		success_callback((!vmr_services._vmr_session || !vmr_services._vmr_session.length) ? [] : [project]);
			
	},
	initialise_editor : function () {
	    CL._services.show_login_status(function() {
		CL._container = document.getElementById('container');
		CL._services.get_editing_projects(undefined, function (projects) {
		    CL.load_single_project_menu(projects[0]);
		});
	    });
	},
	get_adjoining_verse : function (verse, is_previous, result_callback) {
		return result_callback(null);
	},

	get_verse_data : function (verse, witness_list, private_witnesses, success_callback, fail_callback) {
		var url, options, key;
		options = {};
		url = vmr_services._vmr_api + "transcript/get/";
		options = {'format': 'wce', 'indexContent': verse, 'docID': witness_list.join('|')};
		if (private_witnesses) options.userName = vmr_services._user._id;

		console.log(url);

		$.post(url, options, function (xml) {
			if (private_witnesses) vmr_services._last_private_transcription_xml = xml;
			else vmr_services._last_transcription_xml = xml;
			RG.tei2json(xml, function (collate_data) {
				if (private_witnesses) collate_data = [];
				for (var i = 0; i < collate_data.length; ++i) {
					var w = collate_data[i];
					w.transcription_siglum = w.siglum;
					if (private_witnesses) vmr_services._make_private_witness(w);
				}
				success_callback(collate_data);
			});
		
		}, 'text').fail(function(o) {
				fail_callback(o.status);
		});
	},

	get_siglum_map : function (id_list, result_callback) {
		var xml1, xml2, siglum_map, w;
		siglum_map = {};
		//parse xml 
		xml1 = $.parseXML(vmr_services._last_transcription_xml);
		xml2 = $.parseXML(vmr_services._last_private_transcription_xml);
		//any t with no children or text nodes add sigla to siglum_map
		for (var i = 0; i < id_list.length; ++i) {
			w = $(xml1).find('t[docID="'+id_list[i]+'"]');
			if (w.length) {
				siglum_map[$(w).attr('siglum')] = id_list[i];
			}
			else {
				w = $(xml2).find('t[docID="'+id_list[i]+'"]');
				if (w.length) {
					siglum_map[$(w).attr('siglum')] = id_list[i];
				}
			}
		}
		result_callback(siglum_map);
	},

	


	update_rules : function(rules, verse, success_callback) {
		local_services.update_rules(rules, verse, success_callback);
	},
	get_rules_by_ids : function(ids, result_callback, rules, i) {
		local_services.get_rules_by_ids(ids, result_callback, rules, i);
	},
	get_rules : function(verse, subtype, result_callback) {
		local_services.get_rules(verse, subtype, result_callback);
	},
	get_rule_exceptions : function(verse, result_callback, rules, resource_types, i) {
		local_services.get_rule_exceptions(verse, result_callback, rules, resource_types, i);
	},
	update_ruleset : function (for_deletion, for_addition, verse, success_callback) {
		local_services.update_ruleset(for_deletion, for_addition, verse, success_callback);
	},
	save_collation : function (verse, collation, confirm_message, to_apparatus_editor, success_callback) {
		local_services.save_collation(verse, collation, confirm_message, to_apparatus_editor, success_callback);
	},
	get_saved_stage_ids : function (verse, result_callback) {
		local_services.get_saved_stage_ids(verse, result_callback);
	},
	get_saved_collations : function (verse, user_id, result_callback, collations, users, i) {
		local_services.get_saved_collations(verse, user_id, result_callback, collations, users, i);
	},
	get_user_info_by_ids : function (ids, success_callback) {
		local_services.get_user_info_by_ids(ids, success_callback);
	},
	load_saved_collation: function (id, result_callback) {
		local_services.load_saved_collation(id, result_callback);
	},
	do_collation : function(verse, options, result_callback) {
		local_services.do_collation(verse, options, result_callback);
	}
};

CL.set_service_provider(vmr_services);
