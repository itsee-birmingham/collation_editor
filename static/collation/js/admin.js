var CAD = (function () {
    var reg_class_count;
    reg_class_count = 0;
    
    
    return {
        hello: function () {
            console.log('collation admin');
        },
        
        initialise_admin: function (mode) {
            SPN.show_loading_overlay();
            if (CL._services.local_javascript && CL._services.local_javascript.length > 0) {
		//load service specific javascript
		CL.include_javascript(CL._services.local_javascript, function () {
		    CAD.check_login_status(mode);
		    SPN.remove_loading_overlay();
		}); 
	    } else {
		CAD.check_login_status(mode);
		SPN.remove_loading_overlay();
	    }
        },
        
        check_login_status: function (mode) {
            var remembered;
            CAD.show_login_status();
	    MAG.AUTH.get_user_info({'success': function (user) {
		MAG.REST.apply_to_list_of_resources('editing_project', {'criteria' : {'managing_editor' : user._id},
		    'success' : function (response) {
			if (mode === 'admin') {
			    CAD.setup_admin_page(user, response.results);
			} else if (mode == 'project') {
			    CAD.configure_project_page();
			} else if (mode === 'transcriptions') {
			    
			} else if (mode === 'rules') {
			    CAD.configure_rule_page();
			} else if (mode === 'project_summary') {
			    CAD.configure_project_summary_page();			    		    
			}
		}});
	    }});
        },
        
        configure_project_page: function () {
            CAD.show_login_status();
            MAG.AUTH.get_user_info({'success': function (user) {
        	param_dict = MAG.URL.get_current_query();
        	if (param_dict.hasOwnProperty('editing_project')) {
        	    MAG.REST.apply_to_list_of_resources('editing_project', 
    			{'criteria' : {'managing_editor' : user._id, 
    			    '_id': param_dict.editing_project},
    			'success' : function (response) {
    			    if (response.results.length === 1) {
    				CAD.do_configure_project_page(response.results[0]._id);
    			    } else {
    				//no permission to edit this project
    				document.getElementById('container').innerHTML = '<p>You do not have the required permissions to edit this project.</p>';
    			    }
    		    }});
        	} else {
        	    //new project
        	    CAD.do_configure_project_page();
        	}
            }});
        },
        
        upload_project_config: function () {
            var options;
            console.log('got here')
            console.log(JSON.parse(document.getElementById('src').value))
            options = MAG.FORMS.serialize_form('project_config_upload_form');
            console.log(options)
            alert(options.src)
        },
        
	uploadFile: function () {
	    var hidden, file, reader;
	    hidden = document.querySelector('input[id=src]');
	    file = document.querySelector('input[id=index_file]').files[0];
	    reader  = new FileReader();
      
	    reader.onloadend = function () {
		alert(reader.result)
		hidden.value = reader.result;
		document.getElementById('upload_project_config_button').disabled = false;
		MAG.EVENT.addEventListener(document.getElementById('upload_project_config_button'), 'click', function(event) {
		    CAD.upload_project_config();
		});
	    }
	    if (file) {
		reader.readAsText
		hidden.value = "";
	    }
	},
        
        do_configure_project_page: function (project_id) {
            MAG._REQUEST.request('http://' + SITE_DOMAIN + '/collation/htmlfragments/project_edit.html', {
                'mime' : 'text',
                'success' : function (html) {
                    document.getElementById('container').innerHTML = html;
                    if (typeof project_id === 'undefined') {
                	CAD.prepare_form('editing_project');
                    } else {
                	CAD.load_data('editing_project', project_id);
                    }
	    }});
        },
        
        configure_rule_page: function () {
            var rule_names, i;
            CAD.show_login_status();
            MAG.AUTH.get_user_info({'success': function (user) {
        	param_dict = MAG.URL.get_current_query();
		if (param_dict.hasOwnProperty('editing_project')) {
		    MAG.REST.apply_to_list_of_resources('editing_project', 
			{'criteria' : {'managing_editor' : user._id, 
			    '_id': param_dict.editing_project},
			'success' : function (response) {
			    if (response.results.length === 1) {
				rule_names = [];
				for (i = 0; i < response.results[0].regularisation_classes.length; i += 1) {
				    rule_names.push(response.results[0].regularisation_classes[i].name);
				}
				CAD.do_configure_rule_page(response.results[0]._id, rule_names);
			    } else {
				location.href = 'http://' + SITE_DOMAIN + '/collation/admin/';
			    }
		    }});
		} else {
		    location.href = 'http://' + SITE_DOMAIN + '/collation/admin/';
		}
            }});
        },
        
        do_configure_rule_page: function (project, rule_names) {
            MAG._REQUEST.request('http://' + SITE_DOMAIN + '/collation/htmlfragments/rule_editor.html', {
                'mime' : 'text',
                'success' : function (html) {
                    document.getElementById('container').innerHTML = html;
                    if (document.getElementById('rule_name')) {
                	U.FORMS.populate_select(rule_names, document.getElementById('rule_name'));
                    }
                    if (document.getElementById('search_rule_name')) {
                	U.FORMS.populate_select(rule_names, document.getElementById('search_rule_name'));
                    }
                    if (document.getElementById('add_rules_button')) {
        		MAG.EVENT.addEventListener(document.getElementById('add_rules_button'), 'click', function () {
        		    CAD.read_global_rules(project, rule_names);
        		});
        	    } 
                    if (document.getElementById('add_rule')) {
        		MAG.EVENT.addEventListener(document.getElementById('add_rule'), 'click', function () {
        		    CAD.load_global_rule(project, rule_names);
        		});
        	    }
                    if (document.getElementById('search')) {
        		MAG.EVENT.addEventListener(document.getElementById('search'), 'click', function () {
        		    CAD.do_rule_search(project, rule_names);
        		});
        	    }
                    if (document.getElementById('delete_selected')) {
                	MAG.EVENT.addEventListener(document.getElementById('delete_selected'), 'click', function () {
        		    CAD.delete_selected(project, rule_names);
        		});
                    }
                    if (document.getElementById('select_all')) {
                	MAG.EVENT.addEventListener(document.getElementById('select_all'), 'click', function () {
        		    CAD.select_all();
        		});
                    }
            }});
        },
        
        select_all: function () {
            var checks, i;
            if (document.getElementById('select_all').checked === true) {
        	//select all
        	checks = document.getElementsByClassName('delete_check');
        	for (i = 0; i < checks.length; i += 1) {
        	    checks[i].checked = true;
        	}
            } else {
        	//unselect all
        	checks = document.getElementsByClassName('delete_check');
        	for (i = 0; i < checks.length; i += 1) {
        	    checks[i].checked = false;
        	}
            }
        },
        
        delete_selected: function (project, rule_names) {
            var data, to_delete, ok;
            to_delete = [];
            data = U.FORMS.serialize_form('search_form');
            for (key in data) {
        	if (data.hasOwnProperty(key) && key.indexOf('search') === -1) {
        	    to_delete.push(key);
        	}
            }
            console.log(to_delete);
            ok = confirm('Are you sure you want to delete the ' + to_delete.length + ' rules selected.');
            if (ok) {
        	MAG.REST.delete_resources('decision', to_delete, {'success': function (response) {
        	    CAD.do_rule_search(project, rule_names, data);
        	}});
            } else {
        	return;
            }
        },
        
        idify_string: function (string) {
            string = RAVEN.TEMPLATE.trim(string);
            string = string.replace(/\?/g, '');
            string = string.replace(/\./g, '');
            string = string.replace(/ /g, '-');
            string = string.replace(/=/, '');
            string = string.replace(/#/g, '');
            string = string.replace(/%/g, '');
            string = string.replace(/\*/g, '');
            string = string.replace(/{/g, '');
            string = string.replace(/}/g, '');
            string = string.replace(/\(/g, '');
            string = string.replace(/\)/g, '');
            string = string.replace(/\\/g, '');
            string = string.replace(/:/g, '');
            string = string.replace(/</g, '');
            string = string.replace(/>/g, '');
            string = string.replace(/\//g, '');
            string = string.replace(/\+/g, '');
            string = string.replace(/&/g, '');
            string = string.replace(/,/g, '');
            return string;
        },
        
        get_id: function (json) {
            var id, book_string;
            switch (json._model) {
            case 'editing_project':
        	if (json.book < 10) {
        	    book_string = '0' + json.book;
        	} else {
        	    book_string = json.book;
        	}
                id = CAD.idify_string(json.project + '_' + book_string + '_' + json.language);
                break;
            }
            return id;
        },
        
        save: function (form_id, next) {
            var json;
            json = U.FORMS.serialize_form(form_id);
            console.log(json)
            witness_list = [];
            if (document.getElementById('base_text')) {
        	json.base_text = document.getElementById('base_text').value;
            }
            for (key in json.witnesses) {
        	if (json.witnesses.hasOwnProperty(key)) {        	   
        	    witness_list.push(key);
        	}
            }
            //check the chosen base text is in our witness selection
            if (witness_list.indexOf(json.base_text) === -1) {
        	witness_list.push(json.base_text);
            }
            json.witnesses = witness_list
            console.log(json)
            if (json.hasOwnProperty('_id')) {
                CAD.save_resource(json._model, json, next, 'update');
            } else {
        	json._id = CAD.get_id(json);
                CAD.save_resource(json._model, json, next, 'create');
            }
            return;
        },
        
        load_next_page: function(model, id, next) {
            if (next === undefined) {
        	window.location.search = model + '=' + id;
            } else {
        	window.location = next;
            }
            //TODO: remove for loop once timestamps work
            for (item in localStorage) {
                if (item.indexOf('/api/' + model) !== -1) {
                    return localStorage.removeItem(item);
                }
            }
        },
        
        handle_error: function (action, error_report, model) {
            var report;
            report = 'An error has occurred.<br/>';
            if (error_report.status === 401) {
                report += '<br/>You are not authorised to ' + action + ' an entry in the ' + model + ' table.';
            } else if (error_report.status === 409) {
                report += '<br/>It is not possible to ' + action + ' this ' + model + ' because an entry already exists with the same id.';
            } else if (error_report.status === 404) {
                report += '<br/>It is not possible to ' + action + ' this ' + model + ' because there is no ' + model + ' with this id.';
                report += '<br/><br/>This form can be used to add a new ' + model + '.';
            } else {
                report += '<br/>The server has encountered an error. Please try again. <br/>If the problem persists please contact the server administrator.';
            }
            CAD.show_error_box(report);
        },
        
        save_resource: function (model, json, next, type) {
            var options, item;            
            options = {'success': function() {
        	CAD.load_next_page(json._model, json._id, next);
            }, 'error': function(response) {
        	CAD.handle_error('create', response, json._model);
            }};
            if (type === 'create') {
                MAG.REST.create_resource(json._model, json, options);
            } else if (type === 'update') {
                MAG.REST.update_resource(json._model, json, options);
            }
        },

        validate_form: function (form_id) {
            var validation, i, alt_elems;
            validation = U.FORMS.validate_form(form_id);
            if (CAD.recount_wits() === 0) {
        	MAG.ELEMENT.add_className(document.getElementById('witness_count'), 'missing');
        	validation.result = false;
            }
            if (document.getElementById('base_text').value === 'none') {
        	MAG.ELEMENT.add_className(document.getElementById('base_text_span'), 'missing');
        	validation.result = false;
            }
            if (document.getElementById('reg_class_table').getElementsByTagName('TBODY')[0].getElementsByTagName('TR').length === 1) {
        	MAG.ELEMENT.add_className(document.getElementById('reg_class_span'), 'missing');
        	validation.result = false;
            }
            return validation;
        },
        
        show_error_box: function (report) {
            var error_div;
            if (document.getElementById('error') !== null) {
                document.getElementsByTagName('body')[0].removeChild(document.getElementById('error'));
            }
            error_div = document.createElement('div');
            error_div.setAttribute('id', 'error');
            error_div.setAttribute('class', 'error_message');
            error_div.innerHTML = '<span id="error_title"><b>Error</b></span><div id="error_close">close</div><br/><br/>' + report;
            document.getElementsByTagName('body')[0].appendChild(error_div);
            RAVEN.EVENT.addEventListener(document.getElementById('error_close'), 'click', function(event){
                document.getElementsByTagName('body')[0].removeChild(document.getElementById('error'));
            });
        },
        
        submit: function () {
            var validation, key, data, witness_list;
            validation = CAD.validate_form('editing_project_form');
            if (validation.result === true) {
                CAD.save('editing_project_form');      	
            } else {
                MAG.DISPLAY.show_validation(validation);
                CAD.show_error_box('<br/>The data is not valid and cannot be saved. Please fix the errors and resave.'
                        + '<br/><br/>Red text indicates that required data has not been supplied.'
                        + '<br/>A red background indicates that the data in that box is not in a format that is valid.');
            }
            return;
        },
        
        configure_project_summary_page: function (project_id) {
            CAD.show_login_status();
            MAG.AUTH.get_user_info({'success': function (user) {
        	MAG.REST.apply_to_list_of_resources('editing_project', {'criteria' : {'editors' : {'$in' : [user._id]}},
		    'success' : function (response) {
			if (response.results.length === 0) {
			    document.getElementById('container').innerHTML = '<p>You are not involved in any projects so there are no summary details to display.</p>'
			    return;
			} else if (response.results.length === 1 && (project_id === undefined || project_id === response.results[0]._id)) {
			    CAD.setup_project_summary_page(user, response.results, response.results[0]._id);
			} else {
			    if (project_id !== undefined) {
				CAD.setup_project_summary_page(user, response.results, project_id);
			    } else {
				remembered = CL.get_project_cookie();
				CAD.setup_project_summary_page(user, response.results, remembered);
			    }
			}
		}});
            }});
        },
        
	show_login_status: function () {
	    var elem, login_status_message;
	    elem = document.getElementById('login_status');
	    if (elem !== null) {
		MAG.AUTH.get_user_info({'success' : function (response) {
		    if (response.hasOwnProperty('ITSEE_id')) {
			login_status_message = 'logged in as ' + response.ITSEE_id;
		    } else {
			login_status_message = 'logged in ';
		    }
		    elem.innerHTML = login_status_message + '<br/><a href="javascript:MAG.AUTH.log_user_out(\'' + window.location.href + '\')">logout</a>';
		}, 'error': function (response) {
		    elem.innerHTML = '<br/><a href="javascript:MAG.AUTH.log_user_in(\'' + window.location.href + '\')">login</a>';
		}});
	    }
	},
	
	get_project_summary: function (project_id, scope) {
	    var book, i, details, criteria, context_summary;
	    if (scope === undefined || scope === 'none') {
		scope = 'book';
	    }
	    if (scope.indexOf('book') !== -1) {
		scope = 'book';
	    }
	    details = {};
	    details.project = project_id;
	    if (document.getElementById('get_apparatus_button')) {
		MAG.EVENT.addEventListener(document.getElementById('get_apparatus_button'), 'click', function () {
		    window.location = '/apparatus/?project=' + project_id + '&format=negative_plain';
		});
	    }
	    MAG.REST.apply_to_resource('editing_project', project_id, {'success' : function (response) {		
		if (response.book > 9) {
		    book = response.book;
		} else {
		    book = '0' + response.book;
		}
		details.book = book;
		MAG.REST.apply_to_resource('work', 'NT_B' + book, {'success' : function (work) {
		    var chapter, context_summary;
		    details.verse_total = 0;
		    for (chapter in work.verses_per_chapter) {
			if (work.verses_per_chapter.hasOwnProperty(chapter)) {
			    if (scope === 'book' || (scope !== 'book' && scope === chapter)) {
				if (work.verses_per_chapter.hasOwnProperty(chapter)) {
				    details.verse_total += work.verses_per_chapter[chapter];
				}
			    }
			}
		    }
		    details.chapters = work.chapters;
		    criteria = {'project': project_id};
		    if (scope !== 'book') {
			criteria['chapter'] = parseInt(scope, 10);
		    }
		    details.scope = scope;
		    MAG.REST.apply_to_list_of_resources('collation', {'criteria' : criteria, 'fields': ['context', 'status', 'book_number', 'chapter', 'verse'], 'success' : function (collations) {
			details.regularised = [];
			details.set = [];
			details.ordered = [];
			details.approved = [];
			for (i = 0; i < collations.results.length; i += 1) {
			    context_summary = collations.results[i].book_number
			    + '_' + collations.results[i].chapter
			    + '_' + collations.results[i].verse;
			    if (collations.results[i].status === 'regularised') {
				if (details.regularised.indexOf(context_summary) === -1) {
				    details.regularised.push(context_summary);
				}
			    } else if (collations.results[i].status === 'set') {
				if (details.set.indexOf(context_summary) === -1) {
				    details.set.push(context_summary);
				}
			    } else if (collations.results[i].status === 'ordered') {
				if (details.ordered.indexOf(context_summary) === -1) {
				    details.ordered.push(context_summary);
				}
			    } else if (collations.results[i].status === 'approved') {
				if (details.approved.indexOf(context_summary) === -1) {
				    details.approved.push(context_summary);
				}
			    }
			}
			CAD.display_project_summary(details);
		    }});
		}});
	    }});
	},
	
	display_project_summary: function (data) {
	    var levels, verse_total, complete, percent, select_data;
	    levels = ['regularised', 'set', 'ordered', 'approved'];
	    verse_total = data.verse_total;
	    for (i = 0; i < levels.length; i += 1) {
		complete = data[levels[i]].length;
		percent = Math.floor(complete / verse_total * 100);
		document.getElementById(levels[i] + '_progress').innerHTML = complete;
		document.getElementById(levels[i] + '_total').innerHTML = verse_total;
		document.getElementById(levels[i] + '_percentage').innerHTML = percent;
		document.getElementById(levels[i] + '_bar').style.width = percent + 'px';
	    }
	    select_data = ['book ' + data.book];
	    select_chapters = [];
	    for (i = 1; i <= data.chapters; i += 1) {
		select_chapters.push(String(i));
	    }
	    select_data.push.apply(select_data, select_chapters);
	    U.FORMS.populate_select(select_data, document.getElementById('summary_selection'), undefined, undefined, data.scope);
	    U.FORMS.populate_select(select_chapters, document.getElementById('search_chapter'));
	    U.FORMS.populate_select(levels, document.getElementById('search_status'));
	    MAG.EVENT.addEventListener(document.getElementById('details_search_button'), 'click', function () {
		CAD.get_collation_details(data);
	    });
	    MAG.EVENT.addEventListener(document.getElementById('summary_selection'), 'change', function () {
		CAD.get_project_summary(data.project, document.getElementById('summary_selection').value);
	    });
	    MAG.EVENT.addEventListener(document.getElementById('project_select'), 'change', function (event) {
		CAD.configure_project_summary_page(event.target.value);
	    });
	},

	get_collation_details: function (data) {
	    var selection, search;
	    selection = U.FORMS.serialize_form('progress_details_form');
	    search = {'book_number': parseInt(data.book), 'project': data.project, '_sort': [['verse', 1], ['_meta._last_modified_by_display', 1]]};  
	    if (selection.hasOwnProperty('chapter') && selection['chapter'] !== 'none') {
		search['chapter'] = parseInt(selection['chapter']);
		if (selection.hasOwnProperty('status') && selection.status !== 'none') {
		    search.status = selection.status;
		}
		MAG.AUTH.get_user_info({'success': function (user) {
		    if (!selection.hasOwnProperty('all_editors')) {
			search.user = user._id;
		    }
		    MAG.REST.apply_to_list_of_resources('work', {'criteria': {'corpus': 'NT', 'book_number': parseInt(data.book)}, 'success': function (work_details) {
			MAG.REST.apply_to_list_of_resources('collation', {'criteria': search, 'fields': ['status', '_meta', 'context', 'book_number', 'chapter', 'verse'], 'success': function (response) {
			    var chap_length;
			    chap_length = work_details.results[0].verses_per_chapter[selection['chapter']];
			    CAD.show_progress_details(response.results, selection['chapter'], chap_length);
			}});
		    }});		
		}}); 
	    }
	},
	
	show_progress_details: function (data, chapter, chap_length) {
	    var parent, i, j, html, date, minutes, first, count, rows;
	    parent = document.getElementById('progress_details');
	    html = [];
	    html.push('<h4>Chapter ' + chapter + '</h4>');
	    j = 0;
	    html.push('<table id="progress_details_table">');
	    for (i = 1; i <= chap_length; i += 1) {
		first = true;
		count = 0;
		rows = [];
		if ((j < data.length && data[j].verse !== i) || j >= data.length) { //second condition makes sure we catch the last verse if there is no saved collation
		    html.push('<tr>');
		    html.push('<td rowspan="1">V. ' + i + '</td>');
		    html.push('<td colspan="3"></td>');
		    html.push('</tr>');
		}
		while (j < data.length && data[j].verse === i) {
		    rows.push('<tr>');
		    if (first === true) {
			rows.push('<td rowspan="">V. ' + i + '</td>');
			first = false;
			count = 1;
		    } else {
			count += 1;
		    }
		    rows.push('<td>');
		    rows.push(data[j]._meta._last_modified_by_display);
		    rows.push('</td>');
		    rows.push('<td>');
		    date = new Date(data[j]._meta._last_modified_time.$date);
		    if (date.getMinutes() < 10) {
			minutes = '0' + date.getMinutes();
		    } else {
			minutes = String(date.getMinutes());
		    }
		    rows.push(date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear() + ' ' +  date.getHours() + ':' + minutes);
		    rows.push('</td>');
		    rows.push('<td>');
		    rows.push(data[j].status);
		    rows.push('</td>');
		    rows.push('</tr>');
		    j += 1;
		}
		if (rows.length > 0) {
		    rows[1] = rows[1].replace('rowspan=""', 'rowspan="' + count + '"');
		    html.push(rows.join(''));
		}
	    }
	    html.push('</table>');
	    parent.innerHTML = html.join('');	    
	},
	
	setup_project_summary_page: function (user, projects, selected) {
	    var html, i, project_data;
	    html = [];
	    if (projects.length > 1) {
		html.push('<div id="project_select_div"><label for="project_select">Select Project: <select id="project_select"><option value="none">select</option></select></label></div>');
	    }
	    MAG._REQUEST.request('http://' + SITE_DOMAIN + '/collation/htmlfragments/project_summary.html', {
                'mime' : 'text',
                'success' : function (summary) {
                    html.push(summary);
                    document.getElementById('container').innerHTML = html.join('');
                    if (document.getElementById('project_select')) {
                	U.FORMS.populate_select(projects, document.getElementById('project_select'), '_id', '_id', selected);
                    }
                    if (selected !== undefined) {
                	for (i = 0; i < projects.length; i += 1) {
                	    if (projects[i]._id === selected) {
                		project_data = projects[i];
                	    }
                	}
                	CAD.get_project_summary(selected, 'book');
                	document.getElementById('project_selected').innerHTML = 'for ' + selected;
                	MAG.REST.apply_to_resource('editing_project', selected, {'fields': ['managing_editor', 'interfaces', 'approval_settings'], 'success': function (selected_project) {
                	    var revoke;
                	    revoke = false;
                	    if (user._id === selected_project.managing_editor) {
                		if (selected_project.hasOwnProperty('approval_settings') && selected_project.approval_settings.hasOwnProperty('allow_approval_overwrite')) {
                		    if (selected_project.approval_settings.allow_approval_overwrite === false) {
                			revoke = true;
                		    }               		    
                		} else {
                		    if (CL._services.hasOwnProperty('approval_settings') && CL._services.approval_settings.hasOwnProperty('allow_approval_overwrite')) {
                			if (CL._services.approval_settings.allow_approval_overwrite === false) {
                			    revoke = true;
                			}
                		    }
                		}
                		if (revoke) {
                		    document.getElementById('revoke_approved').style.display = 'block';
                		    CAD.setup_revocation_section(selected);
                		}
                		if (selected_project.hasOwnProperty('interfaces') && (selected_project.interfaces.indexOf('version') !== -1 || selected_project.interfaces.indexOf('patristic'))){
                		    document.getElementById('version_export').style.display = 'block';
                		    CAD.setup_version_export(selected);                		    
                		}
                	    }
                	}});
                    } else {
                	document.getElementById('project_selected').innerHTML = '';
                    }
                }
	    }); 
	},
	
	setup_revocation_section: function (project_id) {
	    //find all verses available for revocation (that is all verses which have an approved version but which have not been exported to the version interfaces)
	    //in an ideal world you would be able to revoke verses that had not yet been started but then reexporting them becomes tricky and not allowing this fixes problem arising from a versionist having something open but not saved when something is revoked
	    
	    //(version table must also be changed to use single string context but keep book chapter verse just like collation data)
	    //probably we then need to populate chapter and verse drop downs which are interlinked.
	    //then we have a revoke verse function which deleted the table from main_app - we run a slight risk that a versionist could be working on that very verse but not have saved anything which we do need to consider
	    //also there is a possibility that a verisonist has no data for a chapter and therefore has batch created empty records. We should maybe check that records are saved
	    //when versionists save if no main_apparatus entry is found save should fail but that will annoy them so need some form of fallback - maybe their data structure is saved somewhere else and we can peice them together?
	    
	},
	
	setup_version_export: function (project_id) {
	    var html, chaps, i, key;
	    html = ['<p>There are no complete chapters ready for sending to version interfaces.</p>'];
	    MAG.REST.apply_to_list_of_resources('collation', {'criteria': {'project': project_id, 'status': 'approved'}, 'fields': ['status', 'verse', 'chapter', 'book_number'], 'success': function (response) {
		if (response.results.length > 0) {
		    //then get the work details so we know how many verses we need for each chapter
		    MAG.REST.apply_to_list_of_resources('work', {'criteria': {'book_number': response.results[0].book_number}, 'success': function (work_details) {
			if (work_details.results.length > 0) {
			    chaps = {};
			    full_chaps = [];
			    //chapter numbers are turned into strings for this section
			    for (i = 0; i < response.results.length; i += 1) {
				if (chaps.hasOwnProperty(String(response.results[i].chapter))) {
				    chaps[String(response.results[i].chapter)] += 1;
				} else {
				    chaps[String(response.results[i].chapter)] = 1;
				}
			    }
			    for (key in chaps) {
				if (chaps.hasOwnProperty(key)) {
				    if ((key === '0' || key === '99') && chaps[key] === 1) {
					full_chaps.push(parseInt(key));
				    } else if (work_details.results[0].verses_per_chapter[key] === chaps[key]) {
					full_chaps.push(parseInt(key));
				    }
				}
			    }
			    //chapter numbers are now ints again
			    if (full_chaps.length > 0) {
				full_chaps.sort();
				MAG.REST.apply_to_list_of_resources('main_apparatus', {'criteria': {'project': project_id, 'chapter': {'$in': full_chaps}, 'verse': 1}, 'fields': ['chapter'], 'success': function (main_apps) {
				    for (i = 0; i < main_apps.results.length; i += 1) {
					if (full_chaps.indexOf(main_apps.results[i].chapter) !== -1) {
					    full_chaps.splice(full_chaps.indexOf(main_apps.results[i].chapter), 1);
					}
				    }
				    if (full_chaps.length > 0) {
					html = [];
					html.push('<form id="version_export_form">');
					html.push('<label for="version_export_select">Select chapter: </label><select id="version_export_select" name="version_export_select">');
					html.push('<option value="none">select</option>');
					for (i = 0; i < full_chaps.length; i += 1) {
					    html.push('<option value="' + full_chaps[i] + '">' + full_chaps[i] + '</option>');
					}					
					html.push('</select>');
					html.push('<input type="hidden" id="version_export_project" name="version_export_project" value="' + project_id + '"/>')
					html.push('<input id="version_export_button" type="button" value="Export"/>');
					html.push('</form>');
					CAD.display_version_export(html);
				    } else {
					CAD.display_version_export(html);
				    }
				}});
			    } else {
				CAD.display_version_export(html);
			    }			    
			} else {
			    CAD.display_version_export(html);
			}
		    }});
		} else {
		    CAD.display_version_export(html);
		}
	    }});	    
	},
	
	display_version_export: function (html) {
	    document.getElementById('version_export_content').innerHTML = html.join('');
	    if (document.getElementById('version_export_button')) {
		$('#version_export_button').on('click', function () {
		    CAD.export_to_main_apparatus();
		});
	    }
	},
	
	export_to_main_apparatus: function () {
	    var chap, project, i;
	    chap = document.getElementById('version_export_select').value;
	    if (chap !== 'none') {
		SPN.show_loading_overlay();
		chap = parseInt(chap);
		project = document.getElementById('version_export_project').value;
		//get all the collations for this project that are approved and from this chapter
		MAG.REST.apply_to_list_of_resources('collation', {'criteria': {'project': project, 'chapter': chap, 'status': 'approved'}, 'success': function (response) {
		    for (i = 0; i < response.results.length; i += 1) {
			//change their model and id (id should be context + _ + project_id 
			response.results[i]._model = 'main_apparatus';
			response.results[i]._id = response.results[i].context + '_' + response.results[i].project;
			delete response.results[i].status;
		    }
		    //and create entries in main_apparatus
		    MAG.REST.create_resource('main_apparatus', response.results, {'success': function () {
			CAD.setup_version_export(project);
			SPN.remove_loading_overlay();
		    }});
		}}); 
	    }
	},
	
	setup_admin_page: function (user, projects) {
	    var html;
	    MAG._REQUEST.request('http://' + SITE_DOMAIN + '/collation/htmlfragments/admin_menu.html', {
                'mime' : 'text',
                'success' : function (html) {
                    document.getElementById('container').innerHTML = html;
                    if (projects.length > 0) {
                	document.getElementById('managing_editor_only').style.display = 'block';
                    } 
                    if (projects.length === 1) {
        		//then pre-select the project
                	if (document.getElementById('project')) {
                	    U.FORMS.populate_select(projects, document.getElementById('project'), '_id', '_id', projects[0]._id);
                	}
        		if (document.getElementById('project_for_rules')) {
        		    U.FORMS.populate_select(projects, document.getElementById('project_for_rules'), '_id', '_id', projects[0]._id);	
        		}
        			
        	    } else {
        		if (document.getElementById('project')) {
        		    U.FORMS.populate_select(projects, document.getElementById('project'), '_id', '_id');
        		}
        		if (document.getElementById('project_for_rules')) {
        		    U.FORMS.populate_select(projects, document.getElementById('project_for_rules'), '_id', '_id');
        		}        		
        	    }
                    if (document.getElementById('upload_button')) {
                	MAG.EVENT.addEventListener(document.getElementById('upload_button'), 'click', function () {CAD.go_to_upload()});
                    }
        	    if (document.getElementById('new_project_button')) {
        		MAG.EVENT.addEventListener(document.getElementById('new_project_button'), 'click', function () {CAD.go_to_project()});
        	    }
        	    
        	    if (document.getElementById('edit_project_button')) {
        		MAG.EVENT.addEventListener(document.getElementById('edit_project_button'), 'click', function () {
        		    CAD.go_to_project(document.getElementById('project').value);
        		});
        	    }
        	    if (document.getElementById('edit_rules_button')) {
        		MAG.EVENT.addEventListener(document.getElementById('edit_rules_button'), 'click', function () {
        		    CAD.go_to_rule_editor(document.getElementById('project_for_rules').value); 
        		});
        	    }
                }
	    });
	},
	
	read_global_rules: function (project, rule_names) {
	    var complete, reader;
	    complete = true;
	    if (document.getElementById('file_selector').value === '') {
		MAG.ELEMENT.add_className(document.getElementById('file_selector').parentNode, 'missing');
		complete = false;
	    }
	    if (!complete) {
		alert('You must select a file of rules.');
		return;
	    }
	    reader  = new FileReader();
	    reader.onloadend = function () {
		CAD.load_global_rules(reader.result, project, rule_names);
	    }
	    reader.readAsText(document.getElementById('file_selector').files[0]);
	},

	load_global_rules: function (text, project, rule_names) {
	    var lines, i, tabs, rules, ts, failed_uploads, existing;
	    console.log('loading global rules')
	    lines = text.split('\n');
	    rules = [];
	    ts = [];
	    failed_uploads = {'spaces': [], 'no_rule': [], 'exists': []};
	    //we will always have a header row so start at 1
	    for (i = 1; i < lines.length; i += 1) {
		if (lines[i].length > 0) {
		    tabs = lines[i].split('\t');
		    //now check that t and n don't have spaces
		    if (tabs[0].trim().indexOf(' ') === -1 && tabs[1].trim().indexOf(' ') === -1) {
			if (rule_names.indexOf(tabs[2]) !== -1) {
			    
			    ts.push(tabs[0].trim());
			    
			    rules.push({'t': tabs[0].trim(), 'n': tabs[1].trim(), '_model': 'decision', 'type': 'regularisation', 
				'project': project, 'scope': 'always', 'context': {}, 'subtype': CAD.get_subtype(tabs[0].trim(), tabs[1].trim()),
				'class': CAD.get_rule_value_from_name(tabs[2]), 'preloaded': true,
				'conditions': CAD.get_conditions(tabs[3].trim(), tabs[4].trim(), tabs[5].trim())});
			} else {
			    failed_uploads.no_rule.push(tabs[0].trim() +  ' &gt; ' + tabs[1].trim());
			}
		    } else {
			failed_uploads.spaces.push(tabs[0].trim() +  ' &gt; ' + tabs[1].trim());
		    }	    
		}
	    }
	    //check no global rules exist for these ts
	    //query could be too long for GET and can't be POST because of REST so use recursion and split into slices.
	    CAD.check_rule_existence(ts, failed_uploads, rules, project, 0);
	},
	
	
	check_rule_existence: function (ts, failed_uploads, rules, project, start) {
	    var slice_len;
	    slice_len = 50;
	    if (start < ts.length) {
		ts_section = ts.slice(start, start + slice_len);
		start = start + slice_len;
		MAG.REST.apply_to_list_of_resources('decision', {'criteria': {'t': {'$in': ts_section}, 'project': project, 'scope': 'always'}, 'success': function (response) {
			existing = [];
			if (response.results.length > 0) {
			    for (i = 0; i < response.results.length; i += 1) {
				existing.push(response.results[i].t);
			    }
			}
			for (i = 0; i < rules.length; i += 1) {
			    if (existing.indexOf(rules[i].t) !== -1) {
				failed_uploads.exists.push(rules[i].t +  ' &gt; ' + rules[i].n);
				rules[i] = null;
			    }
			}
			rules = CL.remove_null_items(rules);
			CAD.check_rule_existence(ts, failed_uploads, rules, project, start);
		}});
	    } else {
		if (rules.length > 0) { 
		    MAG.REST.create_resource('decision', rules, {'success': function (response) {
			CAD.create_report(rules.length, failed_uploads);
		    }});
		} else {
		    CAD.create_report(rules.length, failed_uploads);
		}
	    }
	},
	
	do_rule_search: function (project, rule_names, data) {
            var data, query, conditions;
            if (typeof data === 'undefined') {
        	data = U.FORMS.serialize_form('search_form');
            }    
            if (!$.isEmptyObject(data)) {
        	query = {'project': project, 'scope': 'always'};
        	if (data.hasOwnProperty('search_t')) {
        	    query.t = data.search_t;
        	}
        	if (data.hasOwnProperty('search_n')) {
        	    query.n = data.search_n;
        	}
        	if (data.hasOwnProperty('search_rule_name')) {
        	    query['class'] = CAD.get_rule_value_from_name(data.search_rule_name);
        	}
        	//sort out query for conditions
        	if (data.hasOwnProperty('search_ignore_supplied')) {
        	    if (data.search_ignore_supplied === 'Y') {
        		query['conditions.ignore_supplied'] = true;
        	    } 
        	    if (data.search_ignore_supplied === 'N') {
        		query['conditions.ignore_supplied'] = {'$exists': false}
        	    }
        	}
        	if (data.hasOwnProperty('search_ignore_unclear')) {
        	    if (data.search_ignore_unclear === 'Y') {
        		query['conditions.ignore_unclear'] = true;
        	    } 
        	    if (data.search_ignore_unclear === 'N') {
        		query['conditions.ignore_unclear'] = {'$exists': false}
        	    }
        	}
        	if (data.hasOwnProperty('search_nomsac_only')) {
        	    if (data.search_nomsac_only === 'Y') {
        		query['conditions.nomsac_only'] = true;
        	    } 
        	    if (data.search_nomsac_only === 'N') {
        		query['conditions.nomsac_only'] = {'$exists': false}
        	    }
        	}
        	if (data.hasOwnProperty('search_verse_exceptions')) {
        	    if (data.search_verse_exceptions === 'Y') {
        		query['exceptions'] = {'$exists': true};
        	    } 
        	    if (data.search_verse_exceptions === 'N') {
        		query['exceptions'] = {'$exists': false};
        	    }
        	}
        	MAG.REST.apply_to_list_of_resources('decision', {'criteria': query, 'success': function (response) {
        	    var i, j, html, rows, row, found;
        	    rows = document.getElementById('search_table').getElementsByTagName('TBODY')[0].getElementsByTagName('TR');
        	    if (rows.length > 2) {
        		//delete the previous results rows leaving the search rows;
        		for (i = rows.length-1; i >= 2; i -= 1) {
        		    document.getElementById('search_table').deleteRow(i);
        		}
        	    }
        	    for (i = 0; i < response.results.length; i += 1) {
        		row = document.getElementById('search_table').insertRow(-1);//insert a row at the end of the table
        		html = [];
        		html.push('<td>');
        		html.push('<input type="checkbox" id="' + response.results[i]._id + '" class="delete_check", name="' + response.results[i]._id + '"/>');
        		html.push('</td>');
        		html.push('<td>');
        		html.push(response.results[i].t);
        		html.push('</td>');
        		html.push('<td>');
        		html.push(response.results[i].n);
        		html.push('</td>');
        		html.push('<td>');
        		found = false;
        		for (j = 0; j < rule_names.length; j += 1) {
        		    if (CAD.get_rule_value_from_name(rule_names[j]) === response.results[i]['class']) {
        			found = true;
        			html.push(rule_names[j]);
        		    }
        		}
        		if (found === false) {
        		    html.push(response.results[i]['class']);
        		}
        		html.push('</td>');
        		html.push('<td>');
        		if (response.results[i].hasOwnProperty('conditions') && response.results[i].conditions.hasOwnProperty('ignore_supplied')) {
        		    if (response.results[i].conditions.ignore_supplied === true) {
        			html.push('Y');
        		    } else {
        			html.push('N');
        		    }
        		} else {
        		    html.push('N');
        		}
        		html.push('</td>');
        		html.push('<td>');
        		if (response.results[i].hasOwnProperty('conditions') && response.results[i].conditions.hasOwnProperty('ignore_unclear')) {
        		    if (response.results[i].conditions.ignore_unclear === true) {
        			html.push('Y');
        		    } else {
        			html.push('N');
        		    }
        		} else {
        		    html.push('N');
        		}
        		html.push('</td>');
        		html.push('<td>');
        		if (response.results[i].hasOwnProperty('conditions') && response.results[i].conditions.hasOwnProperty('nomsac_only')) {
        		    if (response.results[i].conditions.nomsac_only === true) {
        			html.push('Y');
        		    } else {
        			html.push('N');
        		    }
        		} else {
        		    html.push('N');
        		}
        		html.push('</td>');
        		html.push('<td>');
        		if (response.results[i].hasOwnProperty('exceptions')) {
        		    html.push(response.results[i].exceptions.join(', '));
        		}
        		html.push('</td>');
        		row.innerHTML = html.join('');
        	    }
        	}});
            }
        },
	
	load_global_rule: function (project, rule_names) {
	    var data, failed_uploads, ts, existing, rule;
	    failed_uploads = {'spaces': [], 'no_rule': [], 'exists': []};
	    ts = [];
	    data = U.FORMS.serialize_form('add_rule_form');
	    if (data.t.trim().length === 0 || data.n.trim().length === 0) {
		alert('You must provide and original and a normalised form.');
		return;
	    };
	    if (data.rule_name === 'none') {
		alert('You must select a rule name.');
		return;
	    };
	    rule = {};
	    if (data.t.trim().indexOf(' ') === -1 && data.n.trim().indexOf(' ') === -1) {
		ts.push(data.t);
		rule.t = data.t;
		rule.n = data.n;
		rule._model = 'decision';
		rule.type = 'regularisation';
		rule.project = project;
		rule.scope = 'always';
		rule.context = {};
		rule.subtype = CAD.get_subtype(data.t, data.n);
		rule['class'] = CAD.get_rule_value_from_name(data.rule_name);
		rule.preloaded = true;
		rule.conditions = CAD.get_conditions(data.ignore_supplied, data.ignore_unclear, data.only_nomsac);	
	    } else {
		failed_uploads.spaces.push(data.t.trim() +  ' &gt; ' + data.n.trim());
	    }
	    //now check that there are no global rules which exist for this t
	    MAG.REST.apply_to_list_of_resources('decision', {'criteria': {'t': {'$in': ts}, 'project': project, 'scope': 'always'}, 'success': function (response) {
		existing = [];
		if (response.results.length > 0) {
		    for (i = 0; i < response.results.length; i += 1) {
			existing.push(response.results[i].t);
		    }
		}
		if (existing.indexOf(rule.t) !== -1) {
		    failed_uploads.exists.push(rule.t +  ' &gt; ' + rule.n);
		    rule = {};
		}
		
		if (!$.isEmptyObject(rule)) {
		    MAG.REST.create_resource('decision', rule, {'success': function (response) {
			CAD.create_report(1, failed_uploads);
			document.body.scrollTop = document.documentElement.scrollTop = 0;
			document.getElementById("add_rule_form").reset();
		    }});
		} else {
		    document.body.scrollTop = document.documentElement.scrollTop = 0;
		    CAD.create_report(0, failed_uploads);
		}	
	    }});
	},
	
	create_report: function (rules_success_length, failed_uploads) {
	    //make an overlay for the report
	    var html;
	    html = ['<h2>Rule loading report</h2>'];
	    html.push('<p>' + rules_success_length + ' rules successfully uploaded</p>');
	    if (failed_uploads.spaces.length > 0) {
		html.push('<p>The following rules did not upload because the original or normalised form of the text contained a space:</p>');
		html.push('<ul>');
		for (i = 0; i < failed_uploads.spaces.length; i += 1) {
		    html.push('<li>');
		    html.push(failed_uploads.spaces[i]);
		    html.push('<li>');
		}
		html.push('</ul>');
	    }
	    if (failed_uploads.no_rule.length > 0) {
		html.push('<p>The following rules did not upload because their is no rule class with the specified name:</p>');
		html.push('<ul>');
		for (i = 0; i < failed_uploads.no_rule.length; i += 1) {
		    html.push('<li>');
		    html.push(failed_uploads.no_rule[i]);
		    html.push('<li>');
		}
		html.push('</ul>');
	    }
	    if (failed_uploads.exists.length > 0 ) {
		html.push('<p>The following rules did not upload because a global rule already exists for the original text value:</p>');
		html.push('<ul>');
		for (i = 0; i < failed_uploads.exists.length; i += 1) {
		    html.push('<li>');
		    html.push(failed_uploads.exists[i]);
		    html.push('<li>');
		}
		html.push('</ul>');
	    } 
	    html.push('<br/><br/><input type="button" value="close" id="close_button"/>')
	    document.getElementById('errors_overlay').innerHTML = html.join('');
	    document.getElementById('errors_overlay').style.display = 'block';
	    document.getElementById('errors_overlay').scrollLeft = 0;
            document.getElementById('errors_overlay').scrollTop = 0;
	    if (document.getElementById('close_button')) {
		MAG.EVENT.remove_event('close_report');
		MAG.EVENT.add_event(document.getElementById('close_button'), 'click',
			function (event) {CAD.close_report(); }, 'close_report');
	    }
	},
	
	close_report: function () {
	    document.getElementById('errors_overlay').innerHTML = '';
	    document.getElementById('errors_overlay').style.display = 'none';
	},
	
	get_subtype: function (t, n) {
	    if (CL.prepare_t(t) === n) {
		return 'post-collate';
	    }
	    return 'pre-collate';
	},
	
	get_conditions: function (ignore_supplied, ignore_unclear, only_nomsac) {
	    var conditions;
	    conditions = {};
	    if (ignore_supplied === 'Y' || ignore_supplied === 'y') {
		conditions.ignore_supplied = true;
	    }
	    if (ignore_unclear === 'Y' || ignore_unclear === 'y') {
		conditions.ignore_unclear = true;
	    }
	    if (only_nomsac === 'Y' || only_nomsac === 'y') {
		conditions.only_nomsac = true;
	    }
	    return conditions;
	},
	
	go_to_rule_editor: function (project) {
	    //get the project
	    if (project === 'none') {
		return;
	    }
	    //if a project selected was selected
	    location.href = 'http://' + SITE_DOMAIN + '/collation/admin/rules/?editing_project=' + project;
	},
	
	go_to_upload: function () {
	    location.href = 'http://' + SITE_DOMAIN + '/transcriptions';
	},
	
	go_to_project: function (project) {
	    if (typeof project === 'undefined' && project !== 'none') {
		location.href = 'http://' + SITE_DOMAIN + '/collation/admin/project';
	    } else {
		location.href = 'http://' + SITE_DOMAIN + '/collation/admin/project/?editing_project=' + project;
	    }
	},
	
//	//project editing stuff
//	edit_data: function (model) {
//	    var param_dict;
//	    CAD.show_login_status();
//            MAG.AUTH.check_permission(model, 'update', {'success': function (update_permission) {
//                if (update_permission === true) {
//                    param_dict = MAG.URL.get_current_query();
//                    if (param_dict.hasOwnProperty(model)) {
//                        CAD.load_data(model, param_dict[model]);
//                    } else {
//                        CAD.prepare_form(model);
//                    }
//                } else {
//                    console.log('you do not have permission to edit this data');
//                }
//            }});
//            return;
//	},
	
//	check_form_visibility: function () {
//	    if (document.getElementById('book').value !== 'none' 
//		&& document.getElementById('language').value !== 'none' 
//		    && document.getElementById('project').value !== '') {
//		MAG.ELEMENT.remove_className(document.getElementById('witness_selection_details'), 'disabled');
//		MAG.ELEMENT.remove_className(document.getElementById('rule_definition_section'), 'disabled');
//		MAG.ELEMENT.remove_className(document.getElementById('submission_section'), 'disabled');
//		CAD.populate_witnesses(document.getElementById('book').value, document.getElementById('language').value, {'parent_elem': document.getElementById('witnesses')})
//		
//	    } else {
//		MAG.ELEMENT.add_className(document.getElementById('witness_selection_details'), 'disabled');
//		MAG.ELEMENT.add_className(document.getElementById('rule_definition_section'), 'disabled');
//		MAG.ELEMENT.add_className(document.getElementById('submission_section'), 'disabled');
//	    }
//	},
	
	load_default_classes: function () {
	    reg_class_count = 0;
	    MAG.ELEMENT.add_className(document.getElementById('load_default_classes_message'), 'hidden');
	    MAG.ELEMENT.remove_className(document.getElementById('reg_class_table'), 'hidden');
	    //TODO: rules should come from services is there are any before defaulting to the DEF ones
	    U.FORMS.populate_complex_form({'regularisation_classes': DEF.rules}, document.getElementById('editing_project_form'), 'CAD');
            //add in the extra bits for rules
            for (i = 0; i < reg_class_count; i += 1) {
        	if (document.getElementById('rc_visible_name_' + i)) {
        	    document.getElementById('rc_visible_name_' + i).innerHTML = 
        		document.getElementById('regularisation_classes_' + i + '_name').value;
        	    MAG.EVENT.addEventListener(document.getElementById('delete_regularisation_class_' + i), 
        		    'click', function(event){CAD.delete_regularisation_class(event.target.id);});
        	    MAG.EVENT.addEventListener(document.getElementById('edit_regularisation_class_' + i), 
        		    'click', function(event){CAD.edit_regularisation_class(event.target.id);});
        	}
            }
	},
	
	/** 
	 * get the witnesses for book and language and show them in the screen
	 * options are:
	 * base_text: the base text to select
	 * witnesses: the witnesses to select
	 * parent_elem: the element in which to show the witnesses
	 */
	populate_witnesses: function (book, language, options) {
	    var optns, summary_box, all_checked, cols, elements, book_string, i, j;
	    if (typeof options === 'undefined') {
		options = {};
	    }
	    if (book < 10) {
        	book_string = 'B0' + book;
            } else {
        	book_string = 'B' + book;
            }
	    console.log('populate witnesses')
	    MAG.AUTH.get_user_info({'success' : function (user) {
                MAG.REST.apply_to_list_of_resources('transcription', {'criteria' : {'book_string' : book_string,
    		    	'language' : language},
    		//'_sort': [['document_id', 1]]},
    		'fields': ['book_string', 'verses', 'siglum', 'document_type', 'document_id'],
    		'success': function (results) {
        		MAG.REST.apply_to_list_of_resources('private_transcription', {'criteria' : {'book_string' : book_string,
        		    'language' : language, 'user': user._id,
        		},
        		//'_sort': [['document_id', 1]]},
        		'fields': ['book_string', 'verses', 'siglum', 'document_type', 'document_id'],
        		'success': function (private_results) {
        		    results.results.push.apply(results.results, private_results.results);

        		    optns = {};
        		    if (options.hasOwnProperty('base_text')) {
        			optns.base_text = options.base_text;
        		    }
        		    if (options.hasOwnProperty('parent_elem')) {
        			optns.parent_elem = options.parent_elem;
        		    }
        		    MENU.show_witnesses(results.results, optns);
        		    if (options.hasOwnProperty('witnesses')) {
        			for (i = 0; i < options.witnesses.length; i += 1) {
        			    if (document.getElementById(options.witnesses[i])) {
        				document.getElementById(options.witnesses[i]).checked = true;
        			    }
        			}
        		    }    
                            cols = document.getElementsByClassName('wit_column');
                            for (i = 0; i < cols.length; i += 1) {
                        	elements = cols[i].childNodes;
                        	all_checked = true;
                        	summary_box = undefined;
                        	for (j = 0; j < elements.length; j += 1) {
                        	    if (elements[j].tagName === 'INPUT') {
                        		MAG.EVENT.addEventListener(elements[j], 'click', function() {CAD.recount_wits()});
                			if (elements[j].id.search('Every_') !== -1) {
                			    summary_box = elements[j];                			    
                			} else {
                			    if (elements[j].checked === false) {
                				all_checked = false;
                			    }
                			}
                		    }
                        	}
                        	if (all_checked === true && typeof summary_box !== 'undefined') {
                		    summary_box.checked = true;
                		}
                            }
                            MAG.EVENT.addEventListener(document.getElementById('base_text'), 'change', function(event) {
                        		CAD.update_basetext(); 
                        		CAD.recount_wits(); 
                        		CL.check_witness_lead(event.target.value);
                        	});   		
        	    }});    		
        	}});
    	    }});
	},
	
	load_data: function (model, id) {
	    //TODO: stop the form disabled thing and also make sure that the correct sections are expanded/collapsed
	    var book_hidden, project_hidden, language_hidden, triangles;
            document.getElementById(model + '_form').reset();
            CAD.show_login_status();
            switch (model) {
            case 'editing_project' :
        	MAG.REST.apply_to_resource('editing_project', id, {'success' : function (data) {
        	    MAG.AUTH.get_user_info({'success' : function (user) {
        		if (data.managing_editor === user._id) {
        		    console.log(data);
                            MAG.REST.apply_to_list_of_resources('work', {'criteria': {'_sort':[['short_identifier', 1]]}, 'success' : function (response) {
                    	    	U.FORMS.populate_select(response.results, document.getElementById('book'), 'short_identifier', 'name', data.book, false);
                            }});
                            MAG.ELEMENT.remove_className(document.getElementById('witness_selection_details'), 'disabled');
                            MAG.ELEMENT.remove_className(document.getElementById('rule_definition_section'), 'disabled');
                            MAG.ELEMENT.remove_className(document.getElementById('submission_section'), 'disabled');
                            CAD.populate_witnesses(data.book, data.language, {'witnesses': data.witnesses, 
                        						      'base_text': data.base_text, 
                        						      'parent_elem': document.getElementById('witnesses')});
                            document.getElementById('witness_count').innerHTML = data.witnesses.length;
                            document.getElementById('base_text_span').innerHTML = data.base_text;
                            U.FORMS.populate_complex_form(data, document.getElementById(model + '_form'), 'CAD');
                            //add in the extra bits for rules
                            if (reg_class_count > 0) {
                        	MAG.ELEMENT.add_className(document.getElementById('load_default_classes_message'), 'hidden');
                            }
                            for (i = 0; i < reg_class_count; i += 1) {
                        	if (document.getElementById('rc_visible_name_' + i)) {
                        	    document.getElementById('rc_visible_name_' + i).innerHTML = 
                        		document.getElementById('regularisation_classes_' + i + '_name').value;
                        	    MAG.EVENT.addEventListener(document.getElementById('delete_regularisation_class_' + i), 
                        		    'click', function(event){CAD.delete_regularisation_class(event.target.id);});
                        	    MAG.EVENT.addEventListener(document.getElementById('edit_regularisation_class_' + i), 
                        		    'click', function(event){CAD.edit_regularisation_class(event.target.id);});
                        	}
                            }               
                            CAD.disable_id_fields(data);
                            document.getElementById('identifier').value = data._id;
        		} else {
        		    location.href = 'http://' + SITE_DOMAIN + '/collation/projects/edit/';
        		}
        	    }});	
        	}, 'error' : function (data) {
                    CAD.prepare_form(model);
                    CAD.handle_error('load', data, model);
                }});
        	document.getElementById('submit_first_section').style.display = 'none';
        	//now activate the arrows for the other form sections
        	triangles = document.getElementsByClassName('menu_triangle');
        	for (i = 0; i < triangles.length; i += 1) {
        	    CAD.add_concertina_events(triangles[i]);
        	}
        	CAD.add_eventHandlers(model);
                break;
            }
	},
	
	disable_id_fields: function (data) {
	  //disable those fields which are not safe to change once a project is saved
            document.getElementById('book').disabled = true;
            book_hidden = document.createElement('input');
            book_hidden.setAttribute('type', 'hidden');
            book_hidden.setAttribute('name', 'book');
            book_hidden.setAttribute('value', data.book);
            document.getElementById('project').disabled = true;
            project_hidden = document.createElement('input');
            project_hidden.setAttribute('type', 'hidden');
            project_hidden.setAttribute('name', 'project');
            project_hidden.setAttribute('value', data.project);
            document.getElementById('language').disabled = true;
            language_hidden = document.createElement('input');
            language_hidden.setAttribute('type', 'hidden');
            language_hidden.setAttribute('name', 'language');
            language_hidden.setAttribute('value', data.language);
            document.getElementById('basic_settings_content').appendChild(book_hidden);
            document.getElementById('basic_settings_content').appendChild(project_hidden);
            document.getElementById('basic_settings_content').appendChild(language_hidden);
            document.getElementById('submit_first_section').disabled = true;            
	},
	
	prepare_form: function (model) {
	    switch (model) {
            case 'editing_project' :
        	//this is for new projects
        	MAG.REST.apply_to_list_of_resources('work', {'criteria': {'corpus': 'NT', '_sort':[['short_identifier', 1]]}, 'success' : function (response) {
        	    U.FORMS.populate_select(response.results, document.getElementById('book'), 'short_identifier', 'name');
                }});
        	MAG.AUTH.get_user_info({'success' : function (user) {
        	    document.getElementById('managing_editor').value = user._id;
        	    document.getElementById('editors').value = user._id;
        	    document.getElementById('transcribers').value = user._id;
        	    document.getElementById('reconcilers').value = user._id;
        	    document.getElementById('transcription_managers').value = user._id;
        	}});
        	MAG.EVENT.addEventListener(document.getElementById('book'), 'change', 
        		function () {CAD.update_identifier(model); 
        			     document.getElementById('book_name').value = 
        				    document.getElementById('book').options[document.getElementById('book').selectedIndex].text;});
        	MAG.EVENT.addEventListener(document.getElementById('project'), 'keyup', 
        		function () {CAD.update_identifier(model);});
        	MAG.EVENT.addEventListener(document.getElementById('language'), 'change', 
        		function () {CAD.update_identifier(model);});
        	document.getElementById('new_form_instructions').innerHTML = 'You must complete this section and click \'Ok\' before the rest of the form becomes active.';
             	CAD.add_eventHandlers(model);
        	break;
	    }
	},
	
	check_first_section: function () {
	    var data, id, validation, triangles;
	    //get ID 
	    //TODO: proper regex for empty string test
	    if (document.getElementById('book').value === 'none' || 
		    document.getElementById('language').value === 'none' ||
		    document.getElementById('project').value === '') {
		validation = U.FORMS.validate_form('editing_project_form');
		MAG.DISPLAY.show_validation(validation);
	        CAD.show_error_box('<br/>The project name, book and language must be provided before moving on.' 
	              + '<br/>Please fix the errors and retry.'
	              + '<br/><br/>Red text indicates that required data has not been supplied.');
	        return;
	    }
	    data = {'project': document.getElementById('project').value, 
		    'book': parseInt(document.getElementById('book').value),
	    	    'language': document.getElementById('language').value,
	    	    '_model': 'editing_project'};
	    id = CAD.get_id(data);
	    MAG.REST.check_resource_existence('editing_project', id, {
		'success': function () {
		    //this id exists and we should give an error
		    CAD.show_error_box('There is already a project stored with this ID. Please change the project name to make a unique ID.');
		}, 
		'error': function () {
		    //then this is unique and we can continue
		    CAD.disable_id_fields(data);
		    document.getElementById('identifier').value = id;
		    CAD.populate_witnesses(document.getElementById('book').value, document.getElementById('language').value, {'parent_elem': document.getElementById('witnesses')})
		    MAG.REST.apply_to_list_of_resources('ote_base_text', {'criteria': {'language': document.getElementById('language').value, 
								'book_number': parseInt(document.getElementById('book').value), 
								'_sort':[['book_number', 1]]}, 
								'fields': ['siglum', 'book_number', 'language', 'book_name'],
								'success' : function (response) {
			U.FORMS.populate_select(response.results, document.getElementById('transcription_base_text'), '_id', {1: 'siglum', 2: 'book_name', 3: 'language'});
		    }});
		    //now activate the arrows for the other form sections
            	    triangles = document.getElementsByClassName('menu_triangle');
            	    for (i = 0; i < triangles.length; i += 1) {
            		CAD.add_concertina_events(triangles[i]);
            	    }
            	    //remove the instruction and the ok button
            	    document.getElementById('new_form_instructions').innerHTML = '';
            	    document.getElementById('submit_first_section').style.display = 'none';
		}});
	},
	
	concertina: function (element) {
	    var content;
	    content = element.parentNode.parentNode.parentNode.getElementsByClassName('subsection_content')[0];
	    if (content.style.display === 'none') {
		content.style.display = 'block';
		element.innerHTML = '&#9650';
	    } else {
		content.style.display = 'none';
		element.innerHTML = '&#9660';
	    }
	},
	
	add_concertina_events: function (element) { 
	    MAG.EVENT.add_event(element, 'click', function () {
		CAD.concertina(element);		
	    });
	},
	
	add_eventHandlers: function (model) {
	    
	    MAG.EVENT.addEventListener(document.getElementById('submit_first_section'), 'click',
		    function () {CAD.check_first_section()});
	    MAG.EVENT.addEventListener(document.getElementById('save_reg_class'), 'click', 
		    function () {CAD.save_reg_rule()});
	    MAG.EVENT.addEventListener(document.getElementById('reset_reg_class'), 'click', 
		    function () {CAD.reset_rc_subform()});
	    MAG.EVENT.addEventListener(document.getElementById('show_witness_selection_button'), 'click', 
		    function () {CAD.toggle_witness_selection()});
	    MAG.EVENT.addEventListener(document.getElementById('rc_create_in_RG'), 'click',
		    function () {CAD.toggle_default_select()});
	    MAG.EVENT.addEventListener(document.getElementById('load_default_classes_button'), 'click', 
		    function () {CAD.load_default_classes()});
	    MAG.EVENT.addEventListener(document.getElementById('add_class_button'), 'click',
		    function () {CAD.toggle_class_form()});
	    MAG.EVENT.addEventListener(document.getElementById('hide_subform'), 'click',
		    function () {CAD.toggle_class_form()});
	},
	
	toggle_class_form: function () {
	    if (MAG.ELEMENT.has_className(document.getElementById('rc_subform'), 'hidden')) {
		MAG.ELEMENT.remove_className(document.getElementById('rc_subform'), 'hidden');
		MAG.ELEMENT.add_className(document.getElementById('add_class_button'), 'hidden');
	    } else {
		MAG.ELEMENT.remove_className(document.getElementById('add_class_button'), 'hidden');
		MAG.ELEMENT.add_className(document.getElementById('rc_subform'), 'hidden');		
	    }
	},
	
	uniquify_RG_default_choice: function () {
	    var i;
	    if (document.getElementById('rc_RG_default').checked === true) {
		//go through all existing rules and make any hidden RG_default fields to false
		for (i = 0; i < reg_class_count; i += 1) {
		    if (document.getElementById('regularisation_classes_' + i + '_RG_default')) {
			document.getElementById('regularisation_classes_' + i + '_RG_default').value = false;
		    }
		}
	    }
	},
	
	toggle_default_select: function () {
	    if (document.getElementById('rc_create_in_RG').checked === true) {
		MAG.ELEMENT.remove_className(document.getElementById('RG_default_span'), 'hidden');
	    } else {
		MAG.ELEMENT.add_className(document.getElementById('RG_default_span'), 'hidden');
		document.getElementById('rc_RG_default').checked = false;
	    }
	},
	
	redips_init: function () {
            var rd = REDIPS.drag;
            rd.init();
            rd.event.rowDropped = function () {
        	number = rd.objOld.id.replace('row_for_', '');
        	MAG.EVENT.addEventListener(document.getElementById('delete_regularisation_class_' + number), 
    		    'click', function(event){CAD.delete_regularisation_class(event.target.id);});
    	   	MAG.EVENT.addEventListener(document.getElementById('edit_regularisation_class_' + number), 
    		    'click', function(event){CAD.edit_regularisation_class(event.target.id);});
            };
        },
        
        get_rule_value_from_name: function (name) {
            return name.toLowerCase().replace(' ', '_');
        },
        
        test_name_uniqueness: function (name) {
            var i, value;
            for (i = 0; i < reg_class_count; i += 1) {
        	if (document.getElementById('regularisation_classes_' + i + '_value')) {
        	    value = document.getElementById('regularisation_classes_' + i + '_value').value;
        	    if (name.toLowerCase().replace(' ', '_') === value) {
        		return false;
        	    }
        	}
            }
            return true;
        },
        
	save_reg_rule: function () {
	    var number, name, checkboxes, i;
	    name = document.getElementById('rc_name').value;
	    checkboxes = ['create_in_RG', 'RG_default', 'create_in_SV', 'create_in_OR', 'suffixed_sigla', 'suffixed_label',
	                  'suffixed_reading', 'keep_as_main_reading', 'subreading', 'linked_appendix'];
	    if (name.match(/\S/)) {
		if (CAD.test_name_uniqueness(name)) {
		    CAD.uniquify_RG_default_choice()
		    number = CAD.add_regularisation_classes();
		    document.getElementById('regularisation_classes_' + number + '_name').value = name;
		    document.getElementById('rc_visible_name_' + number).innerHTML = name;
		    document.getElementById('regularisation_classes_' + number + '_value').value = 
				CAD.get_rule_value_from_name(name);
		    document.getElementById('regularisation_classes_' + number + '_identifier').value = 
				document.getElementById('rc_identifier').value;
		    for (i = 0; i < checkboxes.length; i += 1) {
			if (document.getElementById('rc_' + checkboxes[i]).checked === true) {
			    document.getElementById('regularisation_classes_' + number + '_' + checkboxes[i]).value = 'true';
			} else {
			    document.getElementById('regularisation_classes_' + number + '_' + checkboxes[i]).value = 'false';
			}
		    }
		    MAG.EVENT.addEventListener(document.getElementById('edit_regularisation_class_' + number), 'click', 
			    function(event){CAD.edit_regularisation_class(event.target.id);});
		    MAG.EVENT.addEventListener(document.getElementById('delete_regularisation_class_' + number), 'click', 
			    function(event){CAD.delete_regularisation_class(event.target.id);});
		    CAD.reset_rc_subform();
		    CAD.toggle_class_form();
		} else {
		    CAD.show_error_box('You must supply a unique name for the rule');
		}
	    } else {
		CAD.show_error_box('You must supply a name for the rule.');
	    }
	},
	
	reset_rc_subform: function () {
	    var checkboxes, i;
	    checkboxes = ['create_in_RG', 'RG_default', 'create_in_SV', 'create_in_OR', 'suffixed_sigla', 'suffixed_label',
	                  'suffixed_reading', 'keep_as_main_reading', 'subreading', 'linked_appendix'];
	    document.getElementById('rc_name').value = '';
	    document.getElementById('rc_identifier').value = '';
	    for (i = 0; i < checkboxes.length; i += 1) {
		document.getElementById('rc_' + checkboxes[i]).checked = false;
	    }
	    CAD.toggle_default_select();
	    if (document.getElementById('reg_class_table').getElementsByTagName('TBODY')[0].getElementsByTagName('TR').length === 1) {
		MAG.ELEMENT.add_className(document.getElementById('reg_class_table'), 'hidden');
		MAG.ELEMENT.remove_className(document.getElementById('load_default_classes_message'), 'hidden');
	    }
	},
	
	edit_regularisation_class: function (id) {
	    var number, del, inputs, i, target;
	    number = id.replace('edit_regularisation_class_', '');
	    del = document.getElementById('row_for_' + number);
	    inputs = del.childNodes[1].childNodes[0].childNodes;
	    for (i = 0; i < inputs.length; i += 1) {
		target = document.getElementById(inputs[i].id.replace('regularisation_classes_' + number, 'rc'));
		if (target) {
		    if (MAG.ELEMENT.has_className(inputs[i], 'boolean')) {
			if (inputs[i].value === 'true') {
			    U.FORMS.populate_field(target, true);
			} else {
			    U.FORMS.populate_field(target, false);
			}
		    } else {
			U.FORMS.populate_field(target, inputs[i].value);
		    }
		}
	    }
	    CAD.toggle_default_select();
	    MAG.ELEMENT.remove_className(document.getElementById('rc_subform'), 'hidden');
	    MAG.ELEMENT.add_className(document.getElementById('add_class_button'), 'hidden');
	    if (del) {
		del.parentNode.removeChild(del);
	    }
	},
	
	delete_regularisation_class: function (id) {
	    var number, del;
	    number = id.replace('delete_regularisation_class_', '');
	    del = document.getElementById('row_for_' + number);
	    if (del) {
		del.parentNode.removeChild(del);
	    }
	    if (document.getElementById('reg_class_table').getElementsByTagName('TBODY')[0].getElementsByTagName('TR').length === 1) {
		MAG.ELEMENT.add_className(document.getElementById('reg_class_table'), 'hidden');
		MAG.ELEMENT.remove_className(document.getElementById('load_default_classes_message'), 'hidden');
	    }
	},
	
	update_basetext: function () {
	    document.getElementById('base_text_span').innerHTML = document.getElementById('base_text').value;
	},
	
	/** check how many witnesses are selected and change the number in the summary */
	recount_wits: function () {
	    var cols, elements, i, j, count;
	    count = 0;
	    cols = document.getElementsByClassName('wit_column');
            for (i = 0; i < cols.length; i += 1) {
        	elements = cols[i].childNodes;
        	for (j = 0; j < elements.length; j += 1) {
        	    if (elements[j].tagName === 'INPUT') {
			if (elements[j].id.search('Every_') === -1) {
			    if (elements[j].checked === true) {
				count += 1;
			    }
			}
		    }
        	}
            }
            document.getElementById('witness_count').innerHTML = count;
            return count;
	},
	
	//TODO: need way of selecting default for regularisation menu (just from create_in_RG rules)
	/** used by U.FORMS.populate_complex_form */
	add_regularisation_classes: function() {
	    var table, row, cell1, cell2, cell3, cell4;
	    table = document.getElementById('reg_class_table');
	    row = table.insertRow();
	    row.id = 'row_for_' + reg_class_count;
	    cell1 = row.insertCell();
	    cell2 = row.insertCell();
	    cell3 = row.insertCell();
	    cell4 = row.insertCell();
	    cell1.className = 'rowhandler';
	    cell1.innerHTML = '<div class="drag row">+</div>';
	    cell2.innerHTML = '<fieldset id="regularisation_classes_'
		+ reg_class_count + '" class="data_group objectlist"><span id="rc_visible_name_' 
		+ reg_class_count + '"></span><input type="hidden" id="regularisation_classes_'
		+ reg_class_count + '_value" name="regularisation_classes_'
		+ reg_class_count + '_value"/><input type="hidden" class="string" id="regularisation_classes_'
		+ reg_class_count + '_name" name="regularisation_classes_'
		+ reg_class_count + '_name"/><input type="hidden" class="string" id="regularisation_classes_'
		+ reg_class_count + '_identifier" name="regularisation_classes_'
		+ reg_class_count + '_identifier"/><input type="hidden" id="regularisation_classes_'
		+ reg_class_count + '_create_in_RG" name="regularisation_classes_'
		+ reg_class_count + '_create_in_RG" class="boolean"/><input type="hidden" id="regularisation_classes_'
		+ reg_class_count + '_create_in_SV" name="regularisation_classes_'
		+ reg_class_count + '_create_in_SV" class="boolean"/><input type="hidden" id="regularisation_classes_'
		+ reg_class_count + '_create_in_OR" name="regularisation_classes_'
		+ reg_class_count + '_create_in_OR" class="boolean"/><input type="hidden" id="regularisation_classes_'
		+ reg_class_count + '_suffixed_sigla" name="regularisation_classes_'
		+ reg_class_count + '_suffixed_sigla" class="boolean"/><input type="hidden" id="regularisation_classes_'
		+ reg_class_count + '_suffixed_label" name="regularisation_classes_'
		+ reg_class_count + '_suffixed_label" class="boolean"/><input type="hidden" id="regularisation_classes_'
		+ reg_class_count + '_suffixed_reading" name="regularisation_classes_'
		+ reg_class_count + '_suffixed_reading" class="boolean"/><input type="hidden" id="regularisation_classes_'
		+ reg_class_count + '_keep_as_main_reading" name="regularisation_classes_'
		+ reg_class_count + '_keep_as_main_reading" class="boolean"/><input type="hidden" id="regularisation_classes_'
		+ reg_class_count + '_subreading" name="regularisation_classes_'
		+ reg_class_count + '_subreading" class="boolean"/><input type="hidden" id="regularisation_classes_'
		+ reg_class_count + '_linked_appendix" name="regularisation_classes_'
		+ reg_class_count + '_linked_appendix" class="boolean"/><input type="hidden" id="regularisation_classes_'
		+ reg_class_count + '_RG_default" name="regularisation_classes_'
		+ reg_class_count + '_RG_default" class="boolean"/></fieldset>';
	    cell3.innerHTML = '<img alt="delete" id="delete_regularisation_class_' + reg_class_count + '"/>';
	    cell4.innerHTML = '<img alt="edit" id="edit_regularisation_class_' + reg_class_count + '"/>';
	    CAD.redips_init();    
            reg_class_count += 1;
            return reg_class_count - 1;
	},
	
	toggle_witness_selection: function () {
	    witness_sel = document.getElementById('witnesses');
	    if (witness_sel.style.display === 'none') {
		witness_sel.style.display = 'block';
		document.getElementById('show_witness_selection_button').value = 'Hide witness selection';
	    } else {
		witness_sel.style.display = 'none';
		document.getElementById('show_witness_selection_button').value = 'Show witness selection';
	    }
	},
	
	update_identifier: function (model) {
            var identifier, book;
            switch (model) {
            case 'editing_project':
        	if (document.getElementById('book').value === 'none') {
        	    book = '';
        	} else if (parseInt(document.getElementById('book').value) < 10) {
        	    book = '0' + document.getElementById('book').value;
        	} else {
        	    book = document.getElementById('book').value;
        	}
        	identifier = document.getElementById('project').value + '_' + book;
        	document.getElementById('identifier').value = identifier;    
        	break;
            
            }
        },

        
    };
}());
        