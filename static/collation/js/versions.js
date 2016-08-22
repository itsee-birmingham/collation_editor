var VER = (function () {

	return {
		hello: function () {

		},

		_selected_unit: null,
		_version_data: {},
		_other_versions: [],
		_version_language: null,
		_subversionist: false,
		_parent_count: 0,
		_witness_count: 0,
		_ms_details_count: 0,
		_highlighted_version: 'none',

		//this is a the same as CL.inistialise editor excepting that
		//this one calls VER.check_login_status to sort out login rather than the
		//service level inistialise_editor
		initialise_editor: function () {
			SPN.show_loading_overlay();
			//set the dynamic screen resize
			CL.expandFillPageClients();
			$(window).resize(function() {
				CL.expandFillPageClients();
			});
			if (CL._services.local_javascript && CL._services.local_javascript.length > 0) {
				//load service specific javascript
				CL.include_javascript(CL._services.local_javascript, function () {
					VER.check_login_status();
					SPN.remove_loading_overlay();
				}); 
			} else {
				VER.check_login_status();
				SPN.remove_loading_overlay();
			}
		},

		check_login_status: function (mode) {
			var criteria;
			CL._services.show_login_status(function () {
				CL._container = document.getElementById('container');
				CL._services.get_user_info(function (user) {	// success
					if (user) {
						if (mode === 'version_status') {
							VER.configure_version_status_page()
						} else {
							criteria = {'versionists.all' : {'$in': [user._id]}};
							MENU.choose_menu_to_display(user, criteria, 'versions');
						}
					} else {
						CL._container.innerHTML = '<p>Please login using the link in the top right corner to use the editing interface</p>';
					}
				});
			});
		},

		configure_version_status_page: function (project_id) { //TODO: don't think project_id is ever supplied
			MAG.AUTH.get_user_info({'success': function (user) {
				MAG.REST.apply_to_list_of_resources('editing_project', {'criteria' : {'versionists.all' : {'$in' : [user._id]}},
					'success' : function (response) {
						var language;
						if (response.results.length === 0) {
							document.getElementById('container').innerHTML = '<p>You are not involved in any projects so there are no summary details to display.</p>';
							return;
						} else if (response.results.length === 1 && (project_id === undefined || project_id === response.results[0]._id)) {
							language = VER.select_a_default_language(user, response.results, response.results[0]._id);
							VER.setup_version_status_page(user, response.results, response.results[0]._id, language);
							return;
						} else {
							if (project_id !== undefined) {
								language = VER.select_a_default_language(user, response.results, project_id);
								VER.setup_version_status_page(user, response.results, project_id, language);
								return;
							} else {
								remembered = CL.get_project_cookie();
								language = VER.select_a_default_language(user, response.results, remembered);
								VER.setup_version_status_page(user, response.results, remembered, language);
								return;
							}
						}
					}});
			}});
		},

		select_a_default_language: function (user, projects, project_id) {
			var language, i;
			language = VER.get_language_cookie();
			for (i = 0; i < projects.length; i += 1) {
				if (projects[i]._id === project_id) {
					if (projects[i].versionists[user._id].indexOf(language) === -1) { //if the remembered language isn't in the list for this user
						language = projects[i].versionists[user._id][0];
					}
				}
			}
			return language;
		},


		setup_version_status_page: function (user, projects, selected, language) {
			var html, i, project_data;
			html = [];
			html.push('<div id="project_select_div">');
			html.push('<label id="project_select_label" for="project_select">Select Project: <select id="project_select">');
			html.push('<option value="none">select</option></select></label>');
			html.push('<label id="language_select_label" for="language_select">Select Language: <select id="language_select">');
			html.push('<option value="none">select</option></select></label>');
			html.push('</div>');    
			MAG._REQUEST.request('http://' + SITE_DOMAIN + '/collation/htmlfragments/version_status.html', {
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
								if (typeof language !== 'undefined' && projects[i].versionists[user._id].indexOf(language) !== -1) {
									U.FORMS.populate_select(projects[i].versionists[user._id], document.getElementById('language_select'), undefined, undefined, language);
								} else if (projects[i].versionists[user._id].length === 1) {
									U.FORMS.populate_select(projects[i].versionists[user._id], document.getElementById('language_select'), undefined, undefined, projects[i].versionists[user._id][0]);
								} else {
									U.FORMS.populate_select(projects[i].versionists[user._id], document.getElementById('language_select'));
								}
							}
						}
						VER.get_waiting_chapters(selected, user._id);
						VER.get_all_chapters_with_data(selected, user._id, language);
					}
					$('#project_select').on('change.project_change', function () {
						VER.setup_version_status_page(user, projects, document.getElementById('project_select').value);
					});
					$('#language_select').on('change.language_change', function () {
						VER.setup_version_status_page(user, projects, document.getElementById('project_select').value, document.getElementById('language_select').value);
					});
				}	    
			});
		},

		get_all_chapters_with_data: function (project_id, user_id, language) {
			MAG.REST.apply_to_list_of_resources('version_data', {'criteria': {'project': project_id, 'user': user_id, 'language': language}, 'fields': ['chapter'], 'success': function (version_data) {
				var i, chaps, chaps_select_data;
				chaps = [];				
				for (i = 0; i < version_data.results.length; i += 1) {
					if (chaps.indexOf(version_data.results[i].chapter) == -1) {
						chaps.push(version_data.results[i].chapter);
					}
				}
				chaps.sort(VER.sort_num);
				chaps_select_data = [];
				for (i = 0; i < chaps.length; i += 1) {
					if (chaps[i] === 0) {
						chaps_select_data.push({'label': 'incipit', 'value': '0'});
					} else if (chaps[i] === 99) {
						chaps_select_data.push({'label': 'explicit', 'value': '99'});
					} else {
						chaps_select_data.push({'label': chaps[i], 'value': String(chaps[i])});
					}
				}
				U.FORMS.populate_select(chaps_select_data, document.getElementById('text_output_chapter_select'), 'value', 'label');
				$('#text_output_chapter_select').on('change', function () {
					$('#download_text_link').addClass('active');
					document.getElementById('download_text_link').href = '#';
				});
				$('#download_text_link').on('click', function () {
					var chapter;
					if (document.getElementById('text_output_chapter_select').value !== 'none') {
						SPN.show_loading_overlay();
						chapter = parseInt(document.getElementById('text_output_chapter_select').value);
						VER.get_text_output_for_chapter(project_id, user_id, language, chapter);
					}
				});
			}});
		},

		get_waiting_chapters: function (project_id, user_id) {
			MAG.REST.apply_to_resource('editing_project', project_id, {'success' : function (response) {
				var book;
				if (response.versionists.hasOwnProperty('subversionists') && response.versionists.subversionists.indexOf(user_id) !== -1) {
					VER._subversionist = true;
				} else {
					VER._subversionist = false;
				}
				if (response.book > 9) {
					book = response.book;
				} else {
					book = '0' + response.book;
				}
				MAG.REST.apply_to_resource('work', 'NT_B' + book, {'success' : function (work) {
					var verse_totals;
					verse_totals = work.verses_per_chapter;
					verse_totals['0'] = 1;
					verse_totals['99'] = 1;
					MAG.REST.apply_to_list_of_resources('main_apparatus', {'criteria': {'project': project_id }, 'fields': ['chapter'], 'success': function (main_apps) {
						var waiting_chaps, chaps, i, waiting_chaps_select_data;
						waiting_chaps = [];
						for (i = 0; i < main_apps.results.length; i += 1) {
							if (waiting_chaps.indexOf(main_apps.results[i].chapter) === -1) {
								waiting_chaps.push(main_apps.results[i].chapter);
							}
						}
						chaps = [];
						if (waiting_chaps.indexOf(0) !== -1) {
							chaps.push('<span id="incipit" class="chapter_number chapter_ready">Incipit</span> ');
						} else {
							chaps.push('<span id="incipit" class="chapter_number">Incipit</span> ');
						}
						for (i = 1; i <= work.chapters; i += 1) {
							if (waiting_chaps.indexOf(i) !== -1) {
								chaps.push('<span id="chapter_' + i + '" class="chapter_number chapter_ready">' + i + '</span> ');
							} else {
								chaps.push('<span id="chapter_' + i + '" class="chapter_number">' + i + '</span> ');
							}			    
						}
						if (waiting_chaps.indexOf(99) !== -1) {
							chaps.push('<span id="explicit" class="chapter_number chapter_ready">Explicit</span> ');
						} else {
							chaps.push('<span id="explicit" class="chapter_number">Explicit</span> ');
						}
						document.getElementById('chapters_ready').innerHTML = chaps.join('');
						waiting_chaps.sort(VER.sort_num);
						waiting_chaps_select_data = [];
						for (i = 0; i < waiting_chaps.length; i += 1) {
							if (waiting_chaps[i] === 0) {
								waiting_chaps_select_data.push({'label': 'incipit', 'value': '0'});
							} else if (waiting_chaps[i] === 99) {
								waiting_chaps_select_data.push({'label': 'explicit', 'value': '99'});
							} else {
								waiting_chaps_select_data.push({'label': waiting_chaps[i], 'value': String(waiting_chaps[i])});
							}
						}
						if (document.getElementById('language_select').value !== 'none') {							
							VER.get_summary_data(project_id, user_id, waiting_chaps_select_data, verse_totals);
						} else {
							alert('You must select a version language before a summary can be provided.');
						}

					}}); 
				}});
			}});
		},

		get_summary_data: function (project_id, user_id, waiting_chaps, verse_totals, chapter_num) {
			U.FORMS.populate_select(waiting_chaps, document.getElementById('chapter_selection'), 'value', 'label', chapter_num);
			U.FORMS.populate_select(waiting_chaps, document.getElementById('detail_chapter_selection'), 'value', 'label');
			MAG.REST.apply_to_list_of_resources('version_data', {'criteria': {'project': project_id, 'user': user_id,
				'language': document.getElementById('language_select').value}, 
				'success': function (response) {
					var i, submitted, saved, key, book_percent, available_percent, status_type, progress_value,
					chapter, chap, selected_chap, chapter_verses_complete;
					submitted = [];
					saved = [];
					verses_complete = {'submitted': {}, 'saved': {}};
					for (i = 0; i < response.results.length; i += 1) {
						if (response.results[i].hasOwnProperty('submitted')) {
							submitted.push(response.results[i]);
							if (document.getElementById('chapter_selection').value !== 'none') {
								chap = response.results[i].context.substring(response.results[i].context.indexOf('K')+1, response.results[i].context.indexOf('V'));
								if (verses_complete.submitted.hasOwnProperty(chap)) {
									verses_complete.submitted[chap] += 1;
								} else {
									verses_complete.submitted[chap] = 1;
								}
							}
						} else {
							saved.push(response.results[i]);
							if (document.getElementById('chapter_selection').value !== 'none') {
								chap = response.results[i].context.substring(response.results[i].context.indexOf('K')+1, response.results[i].context.indexOf('V'));
								if (verses_complete.saved.hasOwnProperty(chap)) {
									verses_complete.saved[chap] += 1;
								} else {
									verses_complete.saved[chap] = 1;
								}
							}
						}
					}
					total_verses = 0;
					total_available_verses = 0;
					for (key in verse_totals) {
						total_verses += verse_totals[key];
						for (i = 0; i < waiting_chaps.length; i += 1) {
							if (parseInt(waiting_chaps[i].value) === parseInt(key)) {
								total_available_verses += verse_totals[key];
							}
						}						
					}
					status_type = document.getElementById('status_type').value;
					if (status_type === 'both') {
						progress_value = submitted.length + saved.length;
					} else if (status_type === 'submitted') {
						progress_value = submitted.length;
					} else if (status_type === 'saved') {
						progress_value = saved.length;
					}
					document.getElementById('version_language_span').innerHTML = document.getElementById('language_select').value;
					document.getElementById('book_progress').innerHTML = progress_value;
					document.getElementById('book_total').innerHTML = total_verses;
					book_percent = Math.floor(progress_value/total_verses*100);
					document.getElementById('book_percentage').innerHTML = book_percent;
					document.getElementById('book_bar').style.width = book_percent + 'px';
					document.getElementById('available_progress').innerHTML = progress_value;
					document.getElementById('available_total').innerHTML = total_available_verses;
					available_percent = Math.floor(progress_value/total_available_verses*100);
					document.getElementById('available_percentage').innerHTML = available_percent;
					document.getElementById('available_bar').style.width = available_percent + 'px';
					if (document.getElementById('chapter_selection').value !== 'none') {
						selected_chap = document.getElementById('chapter_selection').value;
						console.log(selected_chap)
						if (status_type === 'both') {
							if (verses_complete.submitted.hasOwnProperty(selected_chap)) {
								chapter_verses_complete = verses_complete.submitted[selected_chap]
							} else {
								chapter_verses_complete = 0;
							}
							if (verses_complete.saved.hasOwnProperty(selected_chap)) {
								chapter_verses_complete += verses_complete.saved[selected_chap];
							}
						} else if (status_type === 'submitted') {
							if (verses_complete.submitted.hasOwnProperty(selected_chap)) {
								chapter_verses_complete = verses_complete.submitted[selected_chap];
							} else {
								chapter_verses_complete = 0;
							}
						} else if (status_type === 'saved') {
							if (verses_complete.saved.hasOwnProperty(selected_chap)) {
								chapter_verses_complete = verses_complete.saved[selected_chap];
							} else {
								chapter_verses_complete = 0;
							}
						}
						document.getElementById('chapter_progress').innerHTML = chapter_verses_complete;
						document.getElementById('chapter_total').innerHTML = verse_totals[selected_chap];
						chapter_percent = Math.floor(chapter_verses_complete/verse_totals[selected_chap]*100);
						document.getElementById('chapter_percentage').innerHTML = chapter_percent;
						document.getElementById('chapter_bar').style.width = available_percent + 'px';
					} else {
						VER.reset_chapter_data();
					}
					VER.setup_submission_section(user_id, waiting_chaps, verse_totals);
					VER.add_summary_page_handlers(project_id, user_id, waiting_chaps, verse_totals);
				}});
		},

		setup_submission_section: function (user_id, waiting_chaps, verse_totals) {
			var i, submitted_chaps, submittable_chaps, submittable_chaps_data;
			MAG.REST.apply_to_list_of_resources('version_data', {'criteria': {'project': document.getElementById('project_select').value, 'user': user_id,
				'language': document.getElementById('language_select').value, '$or': [{'submitted': {'$exists': true}}, {'submitted_to_version_editor': {'$exists': true}}]}, 'fields': ['verse', 'chapter'], 
				'success': function (response) {
					submitted_chaps = {};
					for (i = 0; i < response.results.length; i += 1) {
						if (submitted_chaps.hasOwnProperty(response.results[i].chapter)) {
							submitted_chaps[response.results[i].chapter].push(response.results[i].verse);
						} else {
							submitted_chaps[response.results[i].chapter] = [response.results[i].verse];
						}
					}

					submittable_chaps = [];
					for (i = 0; i < waiting_chaps.length; i += 1) {
						if (VER.chapter_has_unsubmitted_verses(waiting_chaps[i].value, submitted_chaps, verse_totals)) {
							submittable_chaps.push(waiting_chaps[i]);
						}
					}
					submittable_chaps_data = [];
					for (i = 0; i < submittable_chaps.length; i += 1) {
						if (submittable_chaps[i].value === '0') {
							submittable_chaps_data.push({'label': 'incipit', 'value': '0'});
						} else if (submittable_chaps[i].value === '99') {
							submittable_chaps_data.push({'label': 'explicit', 'value': '99'});
						} else {
							submittable_chaps_data.push({'label': submittable_chaps[i].value, 'value': submittable_chaps[i].value});
						}					
					}
					U.FORMS.populate_select(submittable_chaps_data, document.getElementById('submit_chapter_select'), 'value', 'label');
				}});   
		},

		sort_num: function (a, b) {
			return a - b;
		},

		chapter_has_unsubmitted_verses: function (chapter, submitted_chaps, verse_totals) {
			var i;
			if (!submitted_chaps.hasOwnProperty(chapter)) {
				return true;
			}
			for (i = 1; i <= verse_totals[chapter]; i += 1) {
				if (submitted_chaps[chapter].indexOf(i) === -1) {
					return true;
				}
			}
			return false;
		},

		get_chapter_details: function (project_id, user_id, verse_totals) {
			var chapter, all_versions, criteria;
			chapter = parseInt(document.getElementById('detail_chapter_selection').value);
			all_versions = document.getElementById('all_versions_checkbox').checked;
			criteria = {'chapter': chapter, 'project': project_id};
			if (all_versions === false) {
				criteria['language'] = document.getElementById('language_select').value;
			}
			MAG.REST.apply_to_resource('editing_project', project_id, {'success': function (project) {
				var languages, uid, lang, user_list, temp;
				languages = [];
				user_list = [];
				for (lang in project.version_subtypes) {
					for (uid in project.version_subtypes[lang]) {
						languages.push(lang + '|' + uid);
						if (user_list.indexOf(uid) === -1) {
							user_list.push(uid);
						}
					}       	    
				}
				languages.sort();
				MAG.REST.apply_to_list_of_resources('version_data', {'criteria': criteria, 'fields': ['submitted', 'submitted_to_version_editor', 'language', 'verse', 'user'], 'success': function (versions) {
					var i, j, data, key, display_langs, table_html, named_display_langs;
					data = {};
					for (i = 1; i <= verse_totals[chapter]; i += 1) {
						data[i] = {'saved': [], 'submitted': [], 'subsubmitted': []};
						for (j = 0; j < versions.results.length; j += 1) {
							if (versions.results[j].verse === i) {
								if (versions.results[j].hasOwnProperty('submitted')) {
									data[i]['submitted'].push(versions.results[j].language + '|' + versions.results[j].user);
								} else if (versions.results[j].hasOwnProperty('submitted_to_version_editor')) {
									data[i]['subsubmitted'].push(versions.results[j].language + '|' + versions.results[j].user);
								} else {
									data[i]['saved'].push(versions.results[j].language + '|' + versions.results[j].user);
								}
							}
						}
					}
					if (all_versions === true) {
						display_langs = languages;
					} else {
						display_langs = [document.getElementById('language_select').value + '|' + user_id];
					}
					MAG.AUTH.resolve_user_ids(user_list, {'success': function (user_names) {
						named_display_langs = []
						for (i = 0; i < display_langs.length; i += 1) {
							temp = display_langs[i].split('|');
							named_display_langs.push(temp[0] + '<br/>' + user_names[temp[1]]);
						}
						table_html = [];
						table_html.push('<table id="details_table">');
						table_html.push('<tr><td></td>');
						for (i = 0; i < named_display_langs.length; i += 1) {
							table_html.push('<td>' + named_display_langs[i] + '</td>');
						}
						table_html.push('</tr>');
						for (key in data) {
							table_html.push('<tr>');
							table_html.push('<td>V. ' + key + '</td>');
							for (i = 0; i < display_langs.length; i += 1) {
								if (data[key].submitted.indexOf(display_langs[i]) !== -1) {
									table_html.push('<td class="submitted">submitted</td>');
								} else if (data[key].subsubmitted.indexOf(display_langs[i]) !== -1) {
									table_html.push('<td class="submitted">submitted to version editor</td>');
								} else if (data[key].saved.indexOf(display_langs[i]) !== -1) {
									table_html.push('<td class="saved">in progress</td>');
								} else {
									table_html.push('<td class="no_data"></td>');
								}
							}
							table_html.push('</tr>');
						}
						table_html.push('</table>');
						document.getElementById('details_table').innerHTML = table_html.join('');
					}});      	    
				}});
			}});
		},

		prepare_submit_chapter: function (waiting_chaps, verse_totals, mode) {
			var criteria, language, project_id, chapter;
			SPN.show_loading_overlay();
			if (document.getElementById('submit_chapter_select').value !== 'none') {
				language = document.getElementById('language_select').value;
				project_id = document.getElementById('project_select').value;
				chapter = parseInt(document.getElementById('submit_chapter_select').value);
				//retrieve all saved verses in this chapter (and lang and proj)
				MAG.AUTH.get_user_info({'success': function (user) {
					criteria = {'language': language, 'project': project_id,
							'chapter': chapter}
					MAG.REST.apply_to_resource('editing_project', project_id, {'fields': ['book'], 'success': function (project) {
						var book
						if (project.book < 10) {
							book = '0' + project.book;
						} else {
							book = project.book;
						}
						CL._project = {'name' : project.project, 
								'_id' : project._id, 
								'book_name' : project.book_name, 
								'versions': project.versions, 
								'versionists': project.versionists,
								'version_subtypes': project.version_subtypes};
						MAG.REST.apply_to_list_of_resources('version_data', {'criteria': criteria, 'success': function (saved) {
							var chapter_data_existing, chapter_data_new, empty_data_verses, i, already_submitted, context, ok,
							updates, creates, key;
							chapter_data_existing = {};
							chapter_data_new = {};
							empty_data_verses = [];
							already_submitted = [];
							for (i = 0; i < saved.results.length; i += 1) {
								if (saved.results[i].hasOwnProperty('submitted') 
										|| saved.results[i].hasOwnProperty('submitted_to_version_editor')) {
									already_submitted.push(saved.results[i].verse);
								} else {
									if ($.isEmptyObject(saved.results[i].data)) {
										empty_data_verses.push(chapter + ':' + saved.results[i].verse);
									}
									chapter_data_existing[saved.results[i].verse] = saved.results[i];       			  
								}
							}
							for (i = 1; i <= verse_totals[parseInt(document.getElementById('submit_chapter_select').value)]; i += 1) {
								if (!chapter_data_existing.hasOwnProperty(i) && already_submitted.indexOf(i) === -1) {
									empty_data_verses.push(chapter + ':' + i);
									context = 'B' + book + 'K' + chapter + 'V' + i;
									chapter_data_new[i] = {
											'_id': context + '_' + language + '_' + user._id + '_' + project._id, 
											'_model': 'version_data',
											'data': {}, 
											'context': context,
											'chapter': chapter, 
											'verse': i, 
											'book_number': project.book,
											'language': language,
											'project': project._id,
											'user': user._id,
									};
								}
							}
							//make blank records for all other verses (you cannot rely on having any in existence to base these on) 
							//record which verses have empty data object and confirm report
							//if confirmed save all objects (some will be new some will be updates)
							if (empty_data_verses.length > 0) {
								ok = confirm('The following verses have no data entered for ' + language + '.\nAre you sure you would like to continue with the submission?\n' + empty_data_verses.join('\n') );
							} else {
								ok = true;
							}
							if (ok) {
								updates = [];
								for (key in chapter_data_existing) {
									if (chapter_data_existing.hasOwnProperty(key)) {
										if (already_submitted.indexOf(chapter_data_existing[key].verse) === -1) {
											updates.push(chapter_data_existing[key]);
										}        				
									}
								}
								creates = [];
								for (key in chapter_data_new) {
									if (chapter_data_new.hasOwnProperty(key)) {
										creates.push(chapter_data_new[key]);
									}
								}
								if (mode === 'subversion') {
									VER.submit_whole_chapter_subversion(creates, updates, user._id);
								} else {
									VER.do_submit_whole_chapter(creates, updates);
								}
							}       		    
						}});
					}});
				}});
			}
		},

		submit_whole_chapter_subversion: function (creates, updates, user_id) {
			var editors, key, div, target, language;
			language = document.getElementById('language_select').value;
			//first select editor by id (steal from normal submit)
			editors = [];
			for (key in CL._project.version_subtypes[language]) {
				if (CL._project.version_subtypes[language].hasOwnProperty(key) && key !== user_id) {
					editors.push(key);
				}
			}
			if (editors.length === 1) {
				VER.do_submit_whole_chapter_subversion(editors[0]);
			} else if (editors.length === 0) {
				alert('There are no other editors for your language for you to submit your work to. Please contact your managing editor for advice.');
			} else {
				CL._services.get_user_info_by_ids(editors, function(user_info) {
					var key, editor_data;
					editor_data = [];
					for (key in user_info) {
						if (user_info.hasOwnProperty(key)) {
							editor_data.push(user_info[key]);
						}
					}
					if (!document.getElementById('subversion_submit_extras')) {
						div = document.createElement('div');
						div.setAttribute('id', 'subversion_submit_extras');
						document.getElementById('container').appendChild(div);
					}
					target = document.getElementById('subversion_submit_extras');
					target.innerHTML = '<label for="submit_comment">Select editor: <select id="version_editor"></select></label>'
						+ '<br/><br/><br/><input type="button" id="cancel_submit_button" value="Cancel"/><input type="button" id="do_submit_button" value="Submit to editor"/>';
					U.FORMS.populate_select(editor_data, document.getElementById('version_editor'), '_id', 'name');
					MAG.EVENT.remove_event('submit_subversion');
					MAG.EVENT.add_event(document.getElementById('do_submit_button'), 'click', function () {
						VER.do_submit_whole_chapter_subversion(document.getElementById('version_editor').value, creates, updates);
					}, 'submit_subversion');
					MAG.EVENT.remove_event('cancel_submit');
					MAG.EVENT.add_event(document.getElementById('cancel_submit_button'), 'click', function () {
						document.getElementById('container').removeChild(document.getElementById('subversion_submit_extras'));
						SPN.remove_loading_overlay();
					}, 'cancel_submit');
				});
			}
		},

		do_submit_whole_chapter_subversion: function (editor, creates, updates) {
			var editor_creates, i, data_list, editor_version;
			document.getElementById('container').removeChild(document.getElementById('subversion_submit_extras'));

			data_list = []
			for (i = 0; i < creates.length; i += 1) {
				editor_version = JSON.parse(JSON.stringify(creates[i]));
				editor_version.user = editor;
				editor_version._id = editor_version.context + '_' + editor_version.language + '_' + editor + '_' + editor_version.project;
				creates[i].submitted_to_version_editor = true;
				data_list.push([editor_version, null, creates[i]]);
			}
			for (i = 0; i < updates.length; i += 1) {
				editor_version = JSON.parse(JSON.stringify(updates[i]));
				editor_version.user = editor;
				editor_version._id = editor_version.context + '_' + editor_version.language + '_' + editor + '_' + editor_version.project;
				updates[i].submitted_to_version_editor = true;
				data_list.push([editor_version, updates[i], null]);
			}
			VER.do_verse_submit_for_chapter(data_list, [], function (error_list) {VER.show_batch_submit_results(error_list)});




//			//TODO: test what happens if some can be created in the version editor table and other cannot
//			//now copy everything (we only need to create when submitting to the editor)
//			editor_creates = JSON.parse(JSON.stringify(creates));
//			editor_creates.push.apply(editor_creates, JSON.parse(JSON.stringify(updates)));
//			//now make these belong to the editor
//			for (i = 0; i < editor_creates.length; i += 1) {
//			editor_creates[i].user = editor;
//			editor_creates[i]._id = editor_creates[i].context + '_' + editor_creates[i].language + '_' + editor + '_' + editor_creates[i].project;
//			}

//			//TODO: data must be ordered by verse with an entry for the manager and a version for current user with pos1 being create and pos2 edit

//			MAG.REST.create_resource('version_data', editor_creates, {'success': function () {
//			//now save the users version as submitted_to_version_editor
//			for (i = 0; i < creates.length; i += 1) {
//			creates[i].submitted_to_version_editor = true;
//			}
//			for (i = 0; i < updates.length; i += 1) {
//			updates[i].submitted_to_version_editor = true;
//			}
//			MAG.REST.update_resources('version_data', updates, {'success': function () {      	    
//			MAG.REST.create_resource('version_data', creates, {'success': function () {
//			alert('Chapter submission successful');
//			VER.configure_version_status_page();
//			SPN.remove_loading_overlay();
//			}, 'error': function () {
//			alert('An error has occurred and your data has not been submitted correctly.\n It has been successfully submitted to your editor but has not been saved correctly for you.\nPlease contact your managing editor and do not edit any verses from this chapter further.');		    
//			}});
//			}, 'error': function () {
//			alert('An error has occurred and your data has not been submitted correctly.\n It has been successfully submitted to your editor but has not been saved correctly for you.\nPlease contact your managing editor and do not edit any verses from this chapter further.');
//			}});
//			}, 'error': function () {
//			alert('There was an error submitting your data to the version editor.\nPlease contact your managing editor for advice.');
//			}});
		},

		show_batch_submit_results: function (error_list) {
			var i, temp, editor_errors, user_errors, alert_message;
			if (error_list.length === 0) {
				alert('Chapter submission successful');
			} else {
				editor_errors = [];
				user_errors = [];
				for (i = 0; i < error_list.length; i += 1) {
					temp = error_list[i].split('|');
					if (temp[1] === 'you') {
						user_errors.push(temp[0].substring(temp[0].indexOf('K')+1, temp[0].indexOf('V')) + ':' + temp[0].substring(temp[0].indexOf('V')+1));
					} else if (temp[1] === 'managing_editor') {
						editor_errors.push(temp[0].substring(temp[0].indexOf('K')+1, temp[0].indexOf('V')) + ':' + temp[0].substring(temp[0].indexOf('V')+1));
					}
				}
				alert_message = [];
				if (editor_errors.length > 0) {
					alert_message.push('The following verses were not submitted to the version editor.');
					alert_message.push('This is probably because the editor is already working on this verse.\n');
					for (i = 0; i < editor_errors.length; i += 1) {
						alert_message.push(editor_errors[i]);
					}
					alert_message.push('');
				}
				if (user_errors.length > 0) {
					alert_message.push('The following verses were submitted to the version editor but were not correctly updated for you.');
					alert_message.push('Please contact your managing editor for advice and do not edit these verses.\n');
					for (i = 0; i < user_errors.length; i += 1) {
						alert_message.push(user_errors[i]);
					}
					alert_message.push('');
				}
				alert(alert_message.join('\n'));
			}
			VER.configure_version_status_page();
			SPN.remove_loading_overlay();
		},

		//Recursive function
		do_verse_submit_for_chapter: function (data_list, error_list, success_callback, i) {
			if (typeof i === 'undefined') {
				i = 0;
			}
			if (i < data_list.length) {
				MAG.REST.create_resource('version_data', data_list[i][0], {'success': function () {
					if (data_list[i][1] !== null) {
						MAG.REST.update_resource('version_data', data_list[i][1], {'success': function () {
							VER.do_verse_submit_for_chapter(data_list, error_list, success_callback, ++i);
						}, 'error': function () {
							error_list.push(data_list[i][0].context + '|' + 'you');
							VER.do_verse_submit_for_chapter(data_list, error_list, success_callback, ++i);
						}});
					} else if (data_list[i][2] !== null) {
						MAG.REST.create_resource('version_data', data_list[i][2], {'success': function () {
							VER.do_verse_submit_for_chapter(data_list, error_list, success_callback, ++i);
						}, 'error': function () {
							error_list.push(data_list[i][0].context + '|' + 'you');
							VER.do_verse_submit_for_chapter(data_list, error_list, success_callback, ++i);
						}});
					}
				}, 'error': function () {
					error_list.push(data_list[i][0].context + '|' + 'managing_editor');
					VER.do_verse_submit_for_chapter(data_list, error_list, success_callback, ++i);
				}});
			} else if (success_callback) {
				success_callback(error_list);
			}
		},        

		do_submit_whole_chapter: function (creates, updates) {
			var i;
			//add submitted flag to everything
			for (i = 0; i < creates.length; i += 1) {
				creates[i].submitted = true;
			}
			for (i = 0; i < updates.length; i += 1) {
				updates[i].submitted = true;
			}
			MAG.REST.update_resources('version_data', updates, {'success': function () {
				MAG.REST.create_resource('version_data', creates, {'success': function () {
					alert('Chapter submission successful');
					VER.configure_version_status_page();
					SPN.remove_loading_overlay();
				}, 'error': function () {
					alert('There was an error saving some of your data, please try again.\nIf the problem persists please contact your managing editor.');
					SPN.remove_loading_overlay();
				}});
			}, 'error': function () {
				alert('There was an error when saving your data, please try again.\nIf the problem persists please contact your managing editor.');
				SPN.remove_loading_overlay();
			}});
		},

//		submit_whole_chapter: function (updates, creates) {
//		var criteria, language, project_id, chapter;
//		if (document.getElementById('submit_chapter_select').value !== 'none') {
//		language = document.getElementById('language_select').value;
//		project_id = document.getElementById('project_select').value;
//		chapter = parseInt(document.getElementById('submit_chapter_select').value);
//		//retrieve all saved verses in this chapter (and lang and proj)
//		MAG.AUTH.get_user_info({'success': function (user) {
//		criteria = {'language': language, 'project': project_id,
//		'chapter': chapter}
//		MAG.REST.apply_to_resource('editing_project', project_id, {'fields': ['book'], 'success': function (project) {
//		var book
//		if (project.book < 10) {
//		book = '0' + project.book;
//		} else {
//		book = project.book;
//		}
//		MAG.REST.apply_to_list_of_resources('version_data', {'criteria': criteria, 'success': function (saved) {
//		var chapter_data_existing, chapter_data_new, empty_data_verses, i, already_submitted, context, ok,
//		updates, creates, key;
//		chapter_data_existing = {};
//		chapter_data_new = {};
//		empty_data_verses = [];
//		already_submitted = [];
//		for (i = 0; i < saved.results.length; i += 1) {
//		if (saved.results[i].hasOwnProperty('submitted')) {
//		already_submitted.push(saved.results[i].verse);
//		} else {
//		if ($.isEmptyObject(saved.results[i].data)) {
//		empty_data_verses.push(chapter + ':' + saved.results[i].verse);
//		}
//		chapter_data_existing[saved.results[i].verse] = saved.results[i];
//		chapter_data_existing[saved.results[i].verse]['submitted'] = true; 
//		}
//		}
//		for (i = 1; i <= verse_totals[parseInt(document.getElementById('submit_chapter_select').value)]; i += 1) {
//		if (!chapter_data_existing.hasOwnProperty(i) && already_submitted.indexOf(i) === -1) {
//		empty_data_verses.push(chapter + ':' + i);
//		context = 'B' + book + 'K' + chapter + 'V' + i;
//		chapter_data_new[i] = {
//		'_id': context + '_' + language + '_' + user._id + '_' + project._id, 
//		'_model': 'version_data',
//		'data': {}, 
//		'context': context,
//		'chapter': chapter, 
//		'verse': i, 
//		'book_number': project.book,
//		'language': language,
//		'project': project._id,
//		'user': user._id,
//		'submitted': true
//		};
//		}
//		}
//		//make blank records for all other verses (you cannot rely on having any in existence to base these on) 
//		//record which verses have emtpy data object and confirm report
//		//if confirmed save all objects (some will be new some will be updates)
//		if (empty_data_verses.length > 0) {
//		ok = confirm('The following verses have no data entered for ' + language + '.\nAre you sure you would like to continue with the submission?\n' + empty_data_verses.join('\n') );
//		} else {
//		ok = true;
//		}
//		if (ok) {
//		updates = [];
//		for (key in chapter_data_existing) {
//		updates.push(chapter_data_existing[key]);
//		}
//		creates = [];
//		for (key in chapter_data_new) {
//		creates.push(chapter_data_new[key]);
//		}       			
//		VER.do_submit_whole_chapter(updates, creates);


////		MAG.REST.update_resources('version_data', updates, {'success': function () {
////		MAG.REST.create_resource('version_data', creates, {'success': function () {
////		VER.setup_submission_section(waiting_chaps, verse_totals);
////		document.getElementById('details_table').innerHTML = '';
////		}});
////		}});



//		}       		    
//		}});
//		}});
//		}});
//		}           
//		},

		reset_chapter_data: function () {
			document.getElementById('chapter_progress').innerHTML = 0
			document.getElementById('chapter_total').innerHTML = 0;
			document.getElementById('chapter_percentage').innerHTML = 0;
			document.getElementById('chapter_bar').style.width = '0px';
		},

		add_summary_page_handlers: function (project_id, user_id, waiting_chaps, verse_totals) {
			if (document.getElementById('status_type')) {
				$('#status_type').off('change.status_type');
				$('#status_type').on('change.status_type', function () {
					VER.get_summary_data(project_id, user_id, waiting_chaps, verse_totals, document.getElementById('chapter_selection').value);
				});
			}
			if (document.getElementById('chapter_selection')) {
				$('#chapter_selection').off('change.chapter_num');
				$('#chapter_selection').on('change.chapter_num', function () {
					VER.get_summary_data(project_id, user_id, waiting_chaps, verse_totals, document.getElementById('chapter_selection').value);
				});
			}
			if (document.getElementById('display_details_button')) {
				$('#display_details_button').off('click.detail_display');
				$('#display_details_button').on('click.detail_display', function () {
					VER.get_chapter_details(project_id, user_id, verse_totals);
				});
			}
			if (document.getElementById('chapter_submit_button')) {
				if (VER._subversionist === true) {
					$('#chapter_submit_button').off('click.submit_chapter');
					$('#chapter_submit_button').on('click.submit_chapter', function () {
						VER.prepare_submit_chapter(waiting_chaps, verse_totals, 'subversion');
					});
				} else {
					$('#chapter_submit_button').off('click.submit_chapter');
					$('#chapter_submit_button').on('click.submit_chapter', function () {
						VER.prepare_submit_chapter(waiting_chaps, verse_totals);
					});
				}
			}
		},
		
		/**create and show the versional editor display
		 * 
		 * required:
		 * context - the verse in the format: B04K6V23
		 * 
		 * optional:
		 * container - the HTML element to put the html result in 
		 *              (defaults to body if not supplied or can't find it)
		 * options - a dict containing other options
		 * 		 possibilities are:
		 *              	highlighted_wit - the witness to highlight in display
		 *              	highlighted_version - the versional witness to highlight in display*/
		show_version_editor: function (options) {
			var container, temp, header, html, highest_unit, overlap_options, app_ids, num, 
			new_overlap_options, overlaps, html_footer, event_rows, row, i, j, key, hands_and_sigla,
			version_langs, blobbed;
			console.log(JSON.parse(JSON.stringify(CL._data)));
			if (typeof options === 'undefined') {
				options = {};
			}
			CL._context = options.context;
			//make sure we have a container to put things in
			if (!options.hasOwnProperty('container') || options.container === null) {
				container = document.getElementsByTagName('body')[0];
			} else {
				container = options.container;
			}
			//sort out options and get layout
			if (!options.hasOwnProperty('highlighted_wit') && CL._highlighted !== 'none') {
				options.highlighted_wit = CL._highlighted;
			}
			if (!options.hasOwnProperty('highlighted_version') && VER._highlighted_version !== 'none') {
				options.highlighted_version = VER._highlighted_version;
			}
			//leave this outside to cancel default right click
			// SimpleContextMenu.setup({'preventDefault' : true, 'preventForms' : false})
			if (!VER._version_data.hasOwnProperty('submitted') && !VER._version_data.hasOwnProperty('submitted_to_version_editor')) {
				//attach right click menus
				SimpleContextMenu.setup({'preventDefault' : true, 'preventForms' : false})
				SimpleContextMenu.attach('variant_unit', function () {return VER.make_menu('unit')});
				SimpleContextMenu.attach('version_parent', function () {return VER.make_menu('version_parent')});
			} else {
				SimpleContextMenu.setup({'preventDefault' : true, 'preventForms' : false})
				SimpleContextMenu.detach_all();
			}
			temp = CL.get_unit_layout(CL._data.apparatus, 1, 'version', options);
			header = CL.get_collation_header(CL._data, temp[1], false);
			html = header[0];
			highest_unit = header[1];
			html.push.apply(html, temp[0]);
			overlap_options = {'column_lengths': temp[1]}
			if (options.hasOwnProperty('highlighted_wit')) {
				overlap_options.highlighted_wit = options.highlighted_wit;
			}
			if (options.hasOwnProperty('highlighted_version')) {
				overlap_options.highlighted_version = options.highlighted_version;
			}
			if (options.hasOwnProperty('highlighted_unit')) {
				overlap_options.highlighted_unit = options.highlighted_unit;
			}

			//sandwich any version 'additions' between the top line apparatus and the overlapping variants
			add_ids = VER.get_ordered_add_lines(VER._version_data);
			for (i = 0; i < add_ids.length; i += 1) {
				num = add_ids[i].replace('additions', '');
				new_overlap_options = VER.calculate_unit_lengths(add_ids[i], VER._version_data, overlap_options);
				overlaps = CL.get_overlap_layout(VER._version_data.data[add_ids[i]], num, 'version_additions', header[1], new_overlap_options);
				html.push.apply(html, overlaps[0]);
				temp[2].push.apply(temp[2], overlaps[1]);
				if (typeof overlaps[2] !== 'undefined') {
					temp[3] = CL.merge_dicts(temp[3], overlaps[2]);
				}
			}
			//add any additions from other language versions
			for (i = 0; i < VER._other_versions.length; i += 1) {
				add_ids = VER.get_ordered_add_lines(VER._other_versions[i]);
				for (j = 0; j < add_ids.length; j += 1) {
					num = add_ids[j].replace('additions', '');
					new_overlap_options = VER.calculate_unit_lengths(add_ids[j], VER._other_versions[i], overlap_options);
					overlaps = CL.get_overlap_layout(VER._other_versions[i].data[add_ids[j]], num, 'other_version_additions', header[1], new_overlap_options);
					html.push.apply(html, overlaps[0]);
					temp[2].push.apply(temp[2], overlaps[1]);
					if (typeof overlaps[2] !== 'undefined') {
						temp[3] = CL.merge_dicts(temp[3], overlaps[2]);
					}
				}
			}
			//add in the overlapping main apparatus units
			app_ids = CL.get_ordered_app_lines();
			for (i = 0; i < app_ids.length; i += 1) {
				num = app_ids[i].replace('apparatus', '');
				new_overlap_options = SV.calculate_unit_lengths(app_ids[i], overlap_options);
				overlaps = CL.get_overlap_layout(CL._data[app_ids[i]], num, 'version', header[1], new_overlap_options);
				html.push.apply(html, overlaps[0]);
				temp[2].push.apply(temp[2], overlaps[1]);
				if (typeof overlaps[2] !== 'undefined') {
					temp[3] = CL.merge_dicts(temp[3], overlaps[2]);
				}
			}
			html.push('<ul id="context_menu" class="SimpleContextMenu"></ul>');
			document.getElementById('verse_ref').innerHTML = CL._context;
			if (VER._version_data.hasOwnProperty('submitted') || VER._version_data.hasOwnProperty('submitted_to_version_editor')) {
				document.getElementById('read_status').innerHTML = 'Read Only';
			} else {
				document.getElementById('read_status').innerHTML = '';
			}
			if (VER._other_versions.length > 0) {
				version_langs = [];
				for (i = 0; i < VER._other_versions.length; i += 1) {
					version_langs.push(VER._other_versions[i].language);
				}
				document.getElementById('other_versions_displayed').innerHTML = '(' + version_langs.join(' ') + ')';
			}
			CL._services.show_login_status();
			document.getElementById('header').className = 'versional_editor_header';
			container.innerHTML = '<div id="scroller"><table class="collation_overview">'
				+ html.join('') + '</table></div><div id="single_witness_reading"></div>';

			//sort out footer stuff
			document.getElementById('scroller').style.height = window.innerHeight - document.getElementById('footer').offsetHeight - document.getElementById('header').offsetHeight - 40 + 'px';
			document.getElementById('single_witness_reading').style.bottom = document.getElementById('footer').offsetHeight + 'px';
			footer_html = [];
			footer_html.push('<input class="left_foot" id="expand_collapse_button" type="button" value="expand all"/>');
			footer_html.push('<a id="download_link" href="#" download="my file"><button>Text output</button></a>');

			// footer_html.push('<input id="get_version_output" type="button" value="Text output"/>');
			footer_html.push('<select id="highlighted_version" name="highlighted_version"></select>');
			footer_html.push('<select id="highlighted" name="highlighted"></select>');
			if (!VER._version_data.hasOwnProperty('submitted') && !VER._version_data.hasOwnProperty('submitted_to_version_editor')) { 
				footer_html.push('<input id="save" type="button" value="Save"/>');
				footer_html.push('<input id="submit" type="button" value="Submit"/>');        	
			}
			document.getElementById('footer').innerHTML = footer_html.join('')

			if (options.hasOwnProperty('highlighted_wit') && options.highlighted_wit !== 'none') {
				CL.get_highlighted_text(options.highlighted_wit);
			}
			CL.add_triangle_functions('table');

			if (document.getElementById('previous_verse')) {
				VER.get_previous_verse_link();
			}
			if (document.getElementById('next_verse')) {
				VER.get_next_verse_link();
			}
			//
			event_rows = temp[2];
			for (i = 0; i < event_rows.length; i += 1) {
				row = document.getElementById(event_rows[i]);
				if (row !== null) {
					VER._add_hover_events(row);
				}
			}
			unit_events = temp[3];
			for (key in unit_events) {
				if (unit_events.hasOwnProperty(key)) {
					row = document.getElementById(key);
					if (row) {
						VER._add_hover_events(row, unit_events[key]);
					}
				}
			}
			//add footer handlers
			hands_and_sigla = SV.get_hands_and_sigla();
			hands_and_sigla.splice(0, 0, {'document': 'none', 'hand': 'Select main apparatus witness'});
			MAG.FORMS.populate_select(hands_and_sigla, document.getElementById('highlighted'), 'document', 'hand', options.highlighted_wit, false);
			ver_wits = VER.get_all_version_witnesses();
			ver_wits.splice(0, 0, {'document': 'none', 'hand': 'Select versional witness'});
			MAG.FORMS.populate_select(ver_wits, document.getElementById('highlighted_version'), 'document', 'hand', options.highlighted_version, false);
			if (document.getElementById('highlighted')) {
				MAG.EVENT.remove_event('highlight_witness');
				MAG.EVENT.add_event(document.getElementById('highlighted'), 'change', function (event) {               
					VER.highlight_witness(event.target.value);
				}, 'highlight_witness');
			}
			if (document.getElementById('highlighted_version')) {
				MAG.EVENT.remove_event('highlight_version_witness');
				MAG.EVENT.add_event(document.getElementById('highlighted_version'), 'change', function (event) {
					VER.highlight_version_witness(event.target.value);
				}, 'highlight_version_witness');
			}
			if (document.getElementById('save')) {
				MAG.EVENT.remove_event('save_version');
				MAG.EVENT.add_event(document.getElementById('save'), 'click', function (event) {
					VER.save_version();
				}, 'save_version');
			}
			if (document.getElementById('submit')) {
				if (VER._subversionist === true) {
					MAG.EVENT.remove_event('submit_version');
					MAG.EVENT.add_event(document.getElementById('submit'), 'click', function (event) {
						VER.submit_subversion();
					}, 'submit_version');
				} else {
					MAG.EVENT.remove_event('submit_version');
					MAG.EVENT.add_event(document.getElementById('submit'), 'click', function (event) {
						VER.submit_version();
					}, 'submit_version');
				}

			}
			if (document.getElementById('download_link')) {
				MAG.EVENT.remove_event('download_link');
				MAG.EVENT.add_event(document.getElementById('download_link'), 'click', function () {

					blobbed = new Blob([VER.get_my_file(VER.get_text_output(VER._version_data, CL._data, CL._context))], {'type': 'text/plain'});
					window.URL = window.URL || window.webkit.url
					document.getElementById('download_link').href = window.URL.createObjectURL(blobbed);
				}, 'download_link');
			}
			if (document.getElementById('get_version_output')) {
				MAG.EVENT.remove_event('get_version_output');
				MAG.EVENT.add_event(document.getElementById('get_version_output'), 'click', function (event) {
					VER.get_text_output(VER._version_data, CL._data, CL._context);
				}, 'get_version_output');

			}
			SPN.remove_loading_overlay();
		},

		get_my_file: function (output) {
			document.getElementById('download_link').download = CL._context + '_' + VER._version_language + '_download.txt';           
			return output;
		},

		_add_hover_events: function (row, witnesses) {
			$(row).on('mouseover', function (event) {VER.display_witnesses_hover(event, witnesses); });
			$(row).on('mouseout', function (event) {CL.hide_tooltip(); });
		},

		display_witnesses_hover: function (event, witnesses) {
			var element;
			element = document.getElementById('tool_tip');
			if (witnesses === undefined) {
				witnesses = VER.get_witnesses_for_reading(event.target.parentNode.parentNode.id);
			}
			if (witnesses !== null) {
				element.innerHTML = witnesses;
			} else {
				return;
			}
			CL.calculate_position(event, element);
			element.style.display = "block";
			event.stopPropagation ? event.stopPropagation() : (event.cancelBubble = true);
		},

		get_witnesses_for_reading: function (id_string) {
			var i, j, unit, reading, app, type, subrow, witnesses;
			if (id_string.indexOf('_app_') !== -1) {
				app = 'apparatus' + id_string.substring(id_string.indexOf('app_') + 4, id_string.indexOf('_row'));
			} else {
				app = 'apparatus';
			}
			if (id_string.indexOf('variant_unit') !== -1) {
				unit = parseInt(id_string.substring(0, id_string.indexOf('_row')).replace('variant_unit_', ''), 10);
				reading = parseInt(id_string.substring(id_string.indexOf('row_') + 4), 10);
				if (!isNaN(unit) && !isNaN(reading)) {
					witnesses = CL.get_reading_witnesses(CL._data[app][unit].readings[reading], app, CL._data[app][unit].start, CL._data[app][unit].end);
					witnesses.push.apply(witnesses, VER.get_reading_witnesses(CL._data[app][unit]._id, CL._data[app][unit].readings[reading]._id, true));
					return witnesses.join(', ');
				}
				return null;
			}
			unit = parseInt(id_string.substring(0, id_string.indexOf('_row')).replace('subreading_unit_', ''), 10);
			reading = parseInt(id_string.substring(id_string.indexOf('row_') + 4, id_string.indexOf('_type_')), 10);
			type = id_string.substring(id_string.indexOf('type_') + 5, id_string.indexOf('_subrow_'));
			subrow = parseInt(id_string.substring(id_string.indexOf('subrow_') + 7), 10);
			if (!isNaN(unit) && !isNaN(reading) && !isNaN(subrow)) {
				witnesses = CL.get_reading_witnesses(CL._data[app][unit].readings[reading].subreadings[type][subrow], app, CL._data[app][unit].start, CL._data[app][unit].end);
				witnesses.push.apply(witnesses, VER.get_reading_witnesses(CL._data[app][unit]._id, CL._data[app][unit].readings[reading].subreadings[type][subrow]._id, true));
				return witnesses.join(', ');
			}
			return null;
		},

		get_all_version_witnesses: function () {
			var wits, key, i, j, k, witnesses, witness_dict, witness_string;
			wits = [];
			witnesses = [];
			for (key in VER._version_data.data) {
				for (i = 0; i < VER._version_data.data[key].length; i += 1) {
					for (j = 0; j <  VER._version_data.data[key][i].readings.length; j += 1) {
						for (k = 0; k < VER._version_data.data[key][i].readings[j].witnesses.length; k += 1) {
							witness_dict = VER._version_data.data[key][i].readings[j].witnesses[k];
							if (witness_dict.hasOwnProperty('subtype') && witness_dict.subtype !== '') {
								witness_string = witness_dict.language + ':' + witness_dict.subtype;
								if (wits.indexOf(witness_string) === -1) {			    
									wits.push(witness_string);
									witnesses.push({'document': ' |' + witness_dict.subtype + '| ', 
										'hand': witness_string});
								}
							} else if (witness_dict.hasOwnProperty('modifier') && witness_dict.modifier !== '') {
								witness_string = witness_dict.language + ':' + witness_dict.modifier;
								if (wits.indexOf(witness_string) === -1) {
									wits.push(witness_string);
									witnesses.push({'document': ' | |' + witness_dict.modifier, 
										'hand': witness_string});
								}
							} else if (witness_dict.hasOwnProperty('language')) {
								witness_string = witness_dict.language;
								if (wits.indexOf(witness_string) === -1) {
									wits.push(witness_string);
									witnesses.push({'document': witness_dict.language + '| | ', 
										'hand': witness_string});
								}
							}
						}
					}
				}
			}
			return witnesses;
		},

		submit_subversion: function () {
			//select the user to submit to and then submit mark current record as submitted_to_version_editor 
			//(this must then become read only for subversionist and a saved version for version editor)
			MAG.AUTH.get_user_info({'success': function (user) {
				var editors, key, div, target;
				editors = [];
				for (key in CL._project.version_subtypes[VER._version_language]) {
					if (CL._project.version_subtypes[VER._version_language].hasOwnProperty(key) && key !== user._id) {
						editors.push(key);
					}
				}
				if (editors.length === 1) {
					VER.do_submit_subversion(editors[0]);
				} else if (editors.length === 0) {
					alert('There are no other editors for your language for you to submit your work to. Please contact your managing editor for advice.');
				} else {
					CL._services.get_user_info_by_ids(editors, function(user_info) {
						var key, editor_data;
						editor_data = [];
						for (key in user_info) {
							if (user_info.hasOwnProperty(key)) {
								editor_data.push(user_info[key]);
							}
						}
						if (!document.getElementById('submit_extras')) {
							div = document.createElement('div');
							div.setAttribute('id', 'submit_extras');
							document.getElementById('container').appendChild(div);
						}
						target = document.getElementById('submit_extras');
						target.innerHTML = '<label for="submit_comment">Select editor: <select id="version_editor"></select></label>'
							+ '<br/><br/><br/><input type="button" id="cancel_subversion_submit" value="Cancel"/><input type="button" id="do_submit_button" value="Submit to editor"/>';
						U.FORMS.populate_select(editor_data, document.getElementById('version_editor'), '_id', 'name');
						MAG.EVENT.remove_event('submit_subversion');
						MAG.EVENT.add_event(document.getElementById('do_submit_button'), 'click', function () {
							VER.do_submit_subversion(document.getElementById('version_editor').value);
						}, 'submit_subversion');
						MAG.EVENT.remove_event('cancel_submit_subversion');
						MAG.EVENT.add_event(document.getElementById('cancel_subversion_submit'), 'click', function () {
							document.getElementById('submit_extras').parentNode.removeChild(document.getElementById('submit_extras'));
						}, 'cancel_submit_subversion');
					});
				}
			}});
		},

		do_submit_subversion: function (editor) {
			var editors_version;
			//make a version for the editor (there must not be a conflict)
			//first copy the _version_data to edit for the editor version
			editors_version = JSON.parse(JSON.stringify(VER._version_data));
			editors_version.user = editor;
			editors_version._id = editors_version.context + '_' + editors_version.language + '_' + editor + '_' + editors_version.project;
			MAG.REST.create_resource('version_data', editors_version, {'success': function () {
				//if that worked make this version 'submitted_to_version_editor' and save that
				VER._version_data.submitted_to_version_editor = true;
				MAG.REST.update_resource ('version_data', VER._version_data, {'success': function () {
					var scroll_offset;
					scroll_offset = [document.getElementById('scroller').scrollLeft,
					                 document.getElementById('scroller').scrollTop];
					VER.show_version_editor({'data': CL._data, 'context': CL._context, 'container': CL._container});
					document.getElementById('message_panel').innerHTML = 'Submit successful';
					document.getElementById('scroller').scrollLeft = scroll_offset[0];
					document.getElementById('scroller').scrollTop = scroll_offset[1];
				}, 'error': function () { //then maybe we don't have one to update yet
					MAG.REST.create_resource('version_data', VER._version_data, {'success': function () {
						var scroll_offset;
						scroll_offset = [document.getElementById('scroller').scrollLeft,
						                 document.getElementById('scroller').scrollTop];
						VER.show_version_editor({'data': CL._data, 'context': CL._context, 'container': CL._container});
						document.getElementById('message_panel').innerHTML = 'Submit successful';
						document.getElementById('scroller').scrollLeft = scroll_offset[0];
						document.getElementById('scroller').scrollTop = scroll_offset[1];
					}, 'error': function () {
						//this really is an error
						document.getElementById('message_panel').innerHTML = '';
						alert('An error has occurred and your data has not been submitted correctly.\n It has been successfully submitted to your editor but has not been saved correctly for you.\nPlease contact your managing editor and do not edit this verse further.');		    
					}});
				}});
			}, 'error': function () {
				alert('There was an error submitting the data to your version editor because they are already working on this verse.\nPlease contact your managing editor for advice.');
			}});
		},

		submit_version: function () {
			VER._version_data.submitted = true;
			MAG.REST.update_resource ('version_data', VER._version_data, {'success': function () {
				var scroll_offset;
				scroll_offset = [document.getElementById('scroller').scrollLeft,
				                 document.getElementById('scroller').scrollTop];
				VER.show_version_editor({'data': CL._data, 'context': CL._context, 'container': CL._container});
				document.getElementById('message_panel').innerHTML = 'Submit successful';
				document.getElementById('scroller').scrollLeft = scroll_offset[0];
				document.getElementById('scroller').scrollTop = scroll_offset[1];
			}, 'error': function () { //then maybe we don't have one to update yet
				MAG.REST.create_resource('version_data', VER._version_data, {'success': function () {
					var scroll_offset;
					scroll_offset = [document.getElementById('scroller').scrollLeft,
					                 document.getElementById('scroller').scrollTop];
					VER.show_version_editor({'data': CL._data, 'context': CL._context, 'container': CL._container});
					document.getElementById('message_panel').innerHTML = 'Submit successful';
					document.getElementById('scroller').scrollLeft = scroll_offset[0];
					document.getElementById('scroller').scrollTop = scroll_offset[1];
				}, 'error': function () {
					//this really is an error
					document.getElementById('message_panel').innerHTML = '';
					alert('An error has occurred and your data could not be submitted.\n Please try again.\nIf the problem persists please contact your managing editor.');		    
				}});
			}});
		},

		save_version: function () {
			MAG.REST.update_resource ('version_data', VER._version_data, {'success': function () {
				document.getElementById('message_panel').innerHTML = 'Save successful';
			}, 'error': function () { //then maybe we don't have one to update yet
				MAG.REST.create_resource('version_data', VER._version_data, {'success': function () {
					document.getElementById('message_panel').innerHTML = 'Save successful';
				}, 'error': function () {
					//this really is an error
					document.getElementById('message_panel').innerHTML = '';
					alert('An error has occurred and your data could not be saved.\n Please try again.\nIf the problem persists please contact your managing editor.');
				}});
			}});
		},



//		start of functions only used for text output		
		get_text_output_for_chapter: function (project_id, user_id, language, chapter) { 
			MAG.REST.apply_to_list_of_resources('version_data', {'criteria': {'project': project_id, 'user': user_id, 'language': language, 'chapter': chapter}, 'success': function (version_data) {
				var callback, output_verses;
				output_verses = version_data.results.sort(function(a, b){return a.verse-b.verse});
				callback = function (data, language, chapter) {
					var blobbed;
					blobbed = new Blob([VER.get_chapter_text_file(data, language, chapter)], {'type': 'text/plain'});
					window.URL = window.URL || window.webkit.url;
					document.getElementById('download_text_link').href = window.URL.createObjectURL(blobbed);
					$('#download_text_link').removeClass('active');
					document.getElementById('download_text_link').click();
					SPN.remove_loading_overlay();
				}
				if ($('#download_text_link').hasClass('active')) {
					VER.do_get_text_output_for_chapter(output_verses, project_id, language, chapter, callback);
				} else {
					SPN.remove_loading_overlay();
				}
			}});
		},

		get_chapter_text_file: function (data, language, chapter) {
			document.getElementById('download_text_link').download = 'chapter' + chapter + '_' + language + '_textoutput.txt';
			return data;
		},

		do_get_text_output_for_chapter: function (version_list, project_id, language, chapter, callback, text_output, i) {
			var context;
			if (i >= version_list.length) {
				if (callback) {
					callback(text_output.join('\n\n'), language, chapter);
				}
				return;
			} 
			if (typeof i === 'undefined') {
				i = 0;
				text_output = [];
			}
			context = version_list[i].context;
			MAG.REST.apply_to_list_of_resources('main_apparatus', {'criteria': {'project': project_id, 'context': context}, 'success': function (main_apparatus) {
				if (main_apparatus.results.length === 1) {
					text_output.push(VER.get_text_output(version_list[i], main_apparatus.results[0].structure, context));
					VER.do_get_text_output_for_chapter(version_list, project_id, language, chapter, callback, text_output, ++i);
				}
			}});         
		},

		get_text_output: function (version_data, mainapp_data, context) {
			var i, unit, output, j, k, reading_text, witnesses, key, sort_key, unit_data, sort_keys;
			output = [];
			output.push(context);
			unit_data = {};
			for (key in version_data.data) {
				if (version_data.data.hasOwnProperty(key)) {
					if (key.indexOf('apparatus') !== -1) {
						for (i = 0; i < version_data.data[key].length; i += 1) {
							unit = version_data.data[key][i];
							sort_key = unit.start + '-' + unit.end;
							unit_data[sort_key] = VER.get_text_output_for_unit(unit, version_data, mainapp_data);
						}
					}
					if (key.indexOf('additions') !== -1) {
						for (i = 0; i < version_data.data[key].length; i += 1) {
							unit = version_data.data[key][i];
							sort_key = unit.start + '-' + unit.end;
							unit_data[sort_key] = VER.get_text_output_for_unit(unit, version_data, mainapp_data, true);
						}
					}
				}
			}
			sort_keys = [];
			for (sort_key in unit_data) {
				if (unit_data.hasOwnProperty(sort_key)) {
					sort_keys.push(sort_key);
				}
			}
			if (sort_keys.length === 0) {
				output.push('\nNo data has been added for this verse');
				return output.join('\n');
			}
			sort_keys.sort(VER.sort_output_units)
			for (i = 0; i < sort_keys.length; i += 1) {
				output.push(unit_data[sort_keys[i]].join(''));
			}
			return output.join('\n');
		},

		get_text_output_for_unit: function (unit, version_data, mainapp_data, addition) {
			var output, j, k, witnesses, reading_text;
			output = [];
			if (unit.start === unit.end) {		    
				output.push('\n' + version_data.chapter + ':' + version_data.verse + '/' + unit.start);
			} else {
				output.push('\n' + version_data.chapter + ':' + version_data.verse + '/' + unit.start + '-' + unit.end);
			}
			//TODO: do we need something in this section that prints the a reading for not additions? might be important for units with entirely new readings in them
			if (addition && addition === true) {
				output.push(': ' + VER.construct_added_unit_reading(mainapp_data, unit.start_unit_id, unit.end_unit_id) + '\n');
			} else {
				output.push('\n');
			}
			for (j = 0; j < unit.readings.length; j += 1) {
				if (addition && addition === true) {
					reading_text = unit.readings[j].version_reading_text;
				} else if (unit.readings[j].parent_readings.length === 0) {
					reading_text = unit.readings[j].version_reading_text;
				} else {
					reading_text = [];
					for (k = 0; k < unit.readings[j].parent_readings.length; k += 1) {
						reading_text.push(VER.get_main_app_reading_by_ids(mainapp_data, unit.start_unit_id, unit.readings[j].parent_readings[k]));
					}
					reading_text = reading_text.join('/');
				}
				output.push(reading_text + ': ');
				witnesses = [];
				for (k = 0; k < unit.readings[j].witnesses.length; k += 1) {			
					witnesses.push(VER.construct_version_witness(unit.readings[j].witnesses[k]));
				}
				output.push(witnesses.join(', '));
				if (unit.readings[j].hasOwnProperty('editor_comment')) {
					output.push('\nComment: ' + unit.readings[j].editor_comment);
				}
			}
			return output;
		},

		sort_output_units: function (a, b) {
			var a_list, b_list;
			a_list = a.split('-');
			b_list = b.split('-');
			if (parseInt(a_list[0]) ===  parseInt(b_list[0])) {
				return parseInt(a_list[1]) - parseInt(b_list[1]);
			} else {
				return parseInt(a_list[0]) - parseInt(b_list[0]);
			}
		},

		construct_added_unit_reading: function (mainapp_data, start_unit_id, end_unit_id) {
			var units, collecting, i, unit, text, t;
			units = [];
			collecting = false;
			for (i = 0; i < mainapp_data.apparatus.length; i += 1) {
				unit = mainapp_data.apparatus[i];
				if (unit._id === start_unit_id) {
					collecting = true;
				}
				if (collecting === true) {
					units.push(unit);
				}
				if (unit._id === end_unit_id) {
					collecting = false;
				}
			}
			text = [];
			for (i = 0; i < units.length; i += 1) {
				t = CL.extract_witness_text(units[i].readings[0]);
				if (t !== 'om.') {
					text.push(t);
				}
			}
			return text.join(' ');
		},

		find_unit_by_id: function (mainapp_data, app_id, unit_id) {
			var i;
			if (mainapp_data.hasOwnProperty(app_id)) {
				for (i = 0; i < mainapp_data[app_id].length; i += 1) {
					if (mainapp_data[app_id][i]._id === unit_id) {
						return mainapp_data[app_id][i];
					}
				}
			}
			return null;
		},

		get_main_app_reading_by_ids: function (mainapp_data, unit_id, reading_id) {
			var key, unit, reading;
			unit = null;
			for (key in mainapp_data) {
				if (unit === null && mainapp_data.hasOwnProperty(key) && key.indexOf('apparatus') != -1) {
					unit = VER.find_unit_by_id(mainapp_data, key, unit_id);
				}
			}
			if (unit) {
				reading = CL.find_reading_by_id(unit, reading_id);
			}
			if (reading) {
				return reading.label + '. ' + CL.extract_witness_text(reading);
			} else {
				return '';
			}
		},
//		end of functions only used for text output


		//this is a reworking of the same function in SV namespace
		//needs reworking as we store start and end id for versional data rather than embedded the ids of the overlapped units
		//in the top line apparatus (this is because we want to keep the verional data standoff for now)
		//reworking this function should allow the same layout generator to be used for both
		calculate_unit_lengths: function (add_id, version, options) {
			var i, j, top_line, id, start_id, end_id, start, add_line, original_column_lengths, length, gap_before, first_hit,
			last_end, gap_counts, highest_gap, gap_after, found_end, previous_unit_gap_after, previous_unit_start, previous_unit_end;
			top_line = CL._data.apparatus;
			add_line = version.data[add_id];

			options.overlap_details = {}; //get rid of the one from the last time
			original_column_lengths = JSON.parse(JSON.stringify(options.column_lengths));

			for (i = 0; i < add_line.length; i += 1) {
				id = add_line[i]._id;
				start_id = add_line[i].start_unit_id;
				end_id = add_line[i].end_unit_id;
				start = -1;
				for (j = 0; j < top_line.length; j += 1) {
					if (top_line[j]._id === start_id && start === -1) {
						start = top_line[j].start;
						add_line[i].start = start;
					}
				}
				length = 0;
				gap_before = 0;
				//find the first hit of this overlap_unit id in the top line
				//recoding the number of units in top line at this index which come before
				first_hit = -1;
				for (j = 0; j < top_line.length; j += 1) {
					if (top_line[j].start === start) {
						if (top_line[j]._id === start_id) {
							if (first_hit === -1) {
								first_hit = j;
							}
						} else {
							if (first_hit === -1) {
								gap_before += 1;
							}
						}
					}
				}
				//if we might have a conflict with gaps here then adjust as necessary
				if (start === previous_unit_end) {
					gap_before = Math.max(gap_before - (original_column_lengths[previous_unit_end] - previous_unit_gap_after), 0);
				}
				if (first_hit === -1) {
					first_hit = 0;
				}
				j = first_hit;
				last_end = null;
				gap_counts = {};
				highest_gap = 0;
				gap_after = 0
				found_end = false;
				while (j < top_line.length) {
					if (top_line[j]._id === end_id || !found_end) {
						length += top_line[j].end - top_line[j].start + 1;
						if (last_end !== null && last_end + 2 === top_line[j].start) {
							length += 1;
						}
						//now work out what we might need to take off the last position column length
						if (top_line[j].start%2 === 1) { //if we start with odd number
							if (top_line[j].start > highest_gap) {
								highest_gap = top_line[j].start;
							}
							if (gap_counts.hasOwnProperty(top_line[j].start)) {
								gap_counts[top_line[j].start] += 1;
							} else {
								gap_counts[top_line[j].start] = 1;
							}
						}
						if (top_line[j]._id === end_id) {
							found_end = true;
						}
						last_end = top_line[j].end;
					} else {
						if (top_line[j].start === last_end) {
							gap_after += 1;
						}
					}
					j += 1;
				}
				//change the end value of the overlap
				add_line[i].end = last_end;
				previous_unit_start = start;
				previous_unit_gap_after = gap_after;
				previous_unit_end = last_end;
				//adjust column length if necessary
				if (last_end%2 === 1) {
					if (gap_counts.hasOwnProperty(highest_gap)) {
						if (options.column_lengths.hasOwnProperty(highest_gap)) {
							options.column_lengths[highest_gap] = options.column_lengths[highest_gap] - gap_counts[highest_gap];
						}
					}
				}
				options.overlap_details[id] = {'col_length': length, 'gap_before': gap_before, 'gap_after': gap_after};
			}
			return options;
		},

		get_ordered_add_lines: function (version) {
			var key, numbers, i, add_ids;
			numbers = [];
			add_ids = [];
			// if (version.hasOwnProperty('data')) {
			if (version.data.hasOwnProperty('additions')) {
				add_ids.push('additions');
			}
			for (key in version.data) {
				if (version.data.hasOwnProperty(key)) {
					if (key.match(/additions\d/g) !== null) {
						numbers.push(parseInt(key.replace('additions', '')));
					}
				}
			}
			numbers.sort();
			for (i = 0; i < numbers.length; i += 1) {
				add_ids.push('additions' + numbers[i]);
			}
			//  }            
			return add_ids;
		},

		get_reading_witnesses: function (unit_id, reading_id, all_languages) {
			var version_witnesses, key, i, j, k, l;
			version_witnesses = [];
			//first do other language versions if required defaulting to true
			if (typeof all_languages === 'undefined' || all_languages === true) {
				for (i = 0; i < VER._other_versions.length; i += 1) {
					for (key in VER._other_versions[i].data) {
						for (j = 0; j < VER._other_versions[i].data[key].length; j += 1) {
							if (unit_id === VER._other_versions[i].data[key][j].start_unit_id 
									&& unit_id === VER._other_versions[i].data[key][j].end_unit_id) {
								for (k = 0; k < VER._other_versions[i].data[key][j].readings.length; k += 1) {
									if (VER._other_versions[i].data[key][j].readings[k].parent_readings.length === 1 
											&& VER._other_versions[i].data[key][j].readings[k].parent_readings[0] === reading_id) {
										for (l = 0; l < VER._other_versions[i].data[key][j].readings[k].witnesses.length; l += 1) {
											version_witnesses.push(VER.construct_version_witness(VER._other_versions[i].data[key][j].readings[k].witnesses[l]));
										}
									}
								}
							}
						}
					}
				}
			}
			//now do the ones for this language
			if (!$.isEmptyObject(VER._version_data)) {
				for (key in VER._version_data.data) {
					if (key.indexOf('apparatus') !== -1) {
						for (i = 0; i < VER._version_data.data[key].length; i += 1) {
							if (unit_id === VER._version_data.data[key][i].start_unit_id 
									&& unit_id === VER._version_data.data[key][i].end_unit_id) {
								for (j = 0; j < VER._version_data.data[key][i].readings.length; j += 1) {
									if (VER._version_data.data[key][i].readings[j].parent_readings.length === 1 
											&& VER._version_data.data[key][i].readings[j].parent_readings[0] === reading_id) {
										for (k = 0; k < VER._version_data.data[key][i].readings[j].witnesses.length; k += 1) {
											version_witnesses.push(VER.construct_version_witness(VER._version_data.data[key][i].readings[j].witnesses[k]));
										}
									}
								}
							}
						}
					}
				}
			}
			return version_witnesses;
		},

		construct_version_witness: function (witness_object) {
			var version_string;
			version_string = witness_object.language;
			if (witness_object.hasOwnProperty('subtype') || witness_object.hasOwnProperty('modifier')) {
				version_string += ':';
			}
			if (witness_object.hasOwnProperty('subtype')) {
				version_string += witness_object.subtype;
			}
			if (witness_object.hasOwnProperty('modifier')) {
				version_string += witness_object.modifier;
			}
			return version_string;
		},

		make_menu: function (menu_name) {
			if (menu_name === 'unit') {
				document.getElementById('context_menu').innerHTML = '<li id="add_version"><span>Add version</span></li>';
			}
			if (menu_name === 'version_parent') {
				document.getElementById('context_menu').innerHTML = '<li id="edit_version_reading"><span>Edit version</span></li><li id="delete_version_reading"><span>Delete version</span></li>';
			}
			VER._add_CM_Handlers();
			return 'context_menu';
		},

		_add_CM_Handlers: function () {
			if (document.getElementById('add_version')) {
				MAG.EVENT.remove_event('av_c');
				MAG.EVENT.remove_event('av_mo');
				MAG.EVENT.add_event(document.getElementById('add_version'), 'click', 
						function(event) {
					var element, div, data_type, unit_number, app_id, elems, i, pos;
					element = SimpleContextMenu._target_element;

					div = CL._get_specified_ancestor(element, 'TR');
					div = CL._get_specified_ancestor(div, 'DIV');
					pos = div.getBoundingClientRect();
					if (div.id.indexOf('addition') !== -1) {
						data_type = 'additions';
						unit_number = div.id.replace('addition_drag_unit_', '');
					} else {
						data_type = 'apparatus';
						unit_number = div.id.replace('drag_unit_', '');
					}
					if (unit_number.indexOf('_') !== -1) { 
						app_id = data_type + unit_number.substring(unit_number.indexOf('_app_')+5);
						unit_number = unit_number.substring(0, unit_number.indexOf('_'));
					} else {
						app_id = data_type;
					}
					unit_number = parseInt(unit_number)
					VER.display_version_form(app_id, unit_number, pos, function () {VER.prepare_version_form(app_id, unit_number)});
					//highlight the unit
					elems = document.getElementsByClassName('version_selected');
					for (i = 0; i < elems.length; i += 1) {
						MAG.ELEMENT.remove_className(elems[i], 'version_selected');
					}
					MAG.ELEMENT.add_className(div, 'version_selected');
				}, 'av_c');
				MAG.EVENT.add_event(document.getElementById('add_version'), 'mouseover', 
						function(event) {CL.hide_tooltip();}, 'av_mo');
			}
			if (document.getElementById('edit_version_reading')) {
				MAG.EVENT.remove_event('evr_c');
				MAG.EVENT.remove_event('evr_mo');
				MAG.EVENT.add_event(document.getElementById('edit_version_reading'), 'click', 
						function(event) {
					var element, tr, div, pos, elems, unit_data;
					element = SimpleContextMenu._target_element;
					tr = CL._get_specified_ancestor(element, 'TR');
					div = CL._get_specified_ancestor(tr, 'DIV');
					pos = div.getBoundingClientRect();
					unit_data = VER.get_version_unit_data(tr.id);
					VER.edit_version_reading(unit_data[0], unit_data[1], pos);
					//highlight the reading
					elems = document.getElementsByClassName('version_selected');
					for (i = 0; i < elems.length; i += 1) {
						MAG.ELEMENT.remove_className(elems[i], 'version_selected');
					}
					MAG.ELEMENT.add_className(tr, 'version_selected');
				}, 'evr_c');
				MAG.EVENT.add_event(document.getElementById('edit_version_reading'), 'mouseover', 
						function(event) {CL.hide_tooltip();}, 'evr_mo');
			}
			if (document.getElementById('delete_version_reading')) {
				MAG.EVENT.remove_event('dvr_c');
				MAG.EVENT.remove_event('dvr_mo');
				MAG.EVENT.add_event(document.getElementById('delete_version_reading'), 'click', 
						function(event) {
					var element, tr, unit_data;
					element = SimpleContextMenu._target_element;
					tr = CL._get_specified_ancestor(element, 'TR');
					unit_data = VER.get_version_unit_data(tr.id);
					VER.delete_version_reading(unit_data[0], unit_data[1]);
				}, 'dvr_c');
				MAG.EVENT.add_event(document.getElementById('delete_version_reading'), 'mouseover', 
						function(event) {CL.hide_tooltip();}, 'dvr_mo');
			}
		},

		get_version_unit_data: function (id) {
			var additionregex, muadditionregex, muregex, match, data_id, unit_num, reading_pos,
			app_id, topline_unit, version_unit_data, main_unit_data, ver_uid, ver_rid;
			additionregex = /^addition_unit_(\d)_(?:app_(\d)_)?versionrow_(\d)$/;
			match = additionregex.exec(id);
			if (match) {
				unit_num = match[1];
				reading_pos = match[3];
				if (typeof match[2] !== 'undefined') {
					data_id = 'additions' + match[2];
				} else {
					data_id = 'additions';
				}
				app_id = 'apparatus';
				ver_uid = VER._version_data.data[data_id][unit_num]._id;
				ver_rid = VER._version_data.data[data_id][unit_num].readings[reading_pos]._id;
				main_unit_data = {};
			} else {
				muadditionregex = /^variant_unit_(\d)_(?:app_(\d)_)?versionrow_(\d)$/;
				match = muadditionregex.exec(id);
				if (match) {
					data_id = 'apparatus';
					reading_pos = match[3];
					if (typeof match[2] !== 'undefined') {
						app_id = 'apparatus' + match[2];
					} else {
						app_id = 'apparatus';
					}
					main_unit_data = {'app_id': app_id, 'unit_num': match[1]};
					unit_num = VER.get_version_unit_from_main_app(app_id, match[1]);

					if (typeof unit_num === 'null') {
						return null;
					}
					ver_uid = VER._version_data.data[data_id][unit_num]._id;
					ver_rid =  VER._version_data.data[data_id][unit_num].readings[reading_pos]._id;
				} else {
					muregex = /^variant_unit_(\d+)_(?:app_(\d)_)?row_(\d)$/;
					match = muregex.exec(id);
					if (match) {
						data_id = 'apparatus';
						if (typeof match[2] !== 'undefined') {
							app_id = 'apparatus' + match[2];
						} else {
							app_id = 'apparatus';
						}
						main_unit_data = {'app_id': app_id, 'unit_num': match[1]};
						unit_num = VER.get_version_unit_from_main_app(app_id, match[1]);
						if (typeof unit_num === 'null') {
							return null;
						}
						reading_pos = VER.get_version_reading_pos_from_main_app(app_id, match[1], match[3]);
						if (typeof reading_pos === 'null') {
							return null;
						}
						ver_uid = VER._version_data.data[data_id][unit_num]._id;
						ver_rid = VER._version_data.data[data_id][unit_num].readings[reading_pos]._id;
					} else {
						return null;
					}
				}
			}
			version_unit_data = {'version_unit_id': ver_uid, 'version_reading_id': ver_rid, 'app_id': data_id, 'unit_num': unit_num, 'reading_pos': reading_pos};
			return [version_unit_data, main_unit_data];
		},

		get_version_unit_from_main_app: function (app_id, unit_num) {
			var main_unit, main_unit_id, version_unit, i;
			main_unit = CL._data[app_id][unit_num];
			main_unit_id = main_unit._id;
			for (i = 0; i < VER._version_data.data.apparatus.length; i += 1) {
				if (VER._version_data.data.apparatus[i].start_unit_id === main_unit_id 
						&& VER._version_data.data.apparatus[i].end_unit_id === main_unit_id) {
					return i;
				}
			}
			return null;
		},

		get_version_reading_pos_from_main_app: function (app_id, unit_num, reading_pos) {
			var main_unit, main_unit_id, version_unit, i, j, mu_reading_id, reading_id;
			main_unit = CL._data[app_id][unit_num];
			main_unit_id = main_unit._id;
			mu_reading_id = main_unit.readings[reading_pos]._id;
			for (i = 0; i < VER._version_data.data.apparatus.length; i += 1) {
				if (VER._version_data.data.apparatus[i].start_unit_id === main_unit_id 
						&& VER._version_data.data.apparatus[i].end_unit_id === main_unit_id) {
					//then we have the right unit so find the right reading
					for (j = 0; j < VER._version_data.data.apparatus[i].readings.length; j += 1) {
						if (VER._version_data.data.apparatus[i].readings[j].parent_readings.length === 1 
								&& VER._version_data.data.apparatus[i].readings[j].parent_readings[0] === mu_reading_id) {
							return j;
						}
					}
				}
			}
			return null;
		},

		delete_version_reading: function (version_unit_data, main_unit_data) {
			if (confirm('Are you sure you want to delete the version data for this reading?')) {
				VER.do_delete_version(version_unit_data, main_unit_data);
			}
		},

		do_delete_version: function (version_unit_data, main_unit_data) {
			var unit, reading_pos, scroll_offset;
			unit = VER.get_version_unit_by_id(version_unit_data.version_unit_id);
			if (unit !== null) {
				reading_pos = VER.find_version_reading_pos_by_id(unit, version_unit_data.version_reading_id);
				if (reading_pos !== null) {
					scroll_offset = [document.getElementById('scroller').scrollLeft,
					                 document.getElementById('scroller').scrollTop];
					unit.readings.splice(reading_pos, 1);
					if (unit.readings.length === 0) {
						VER.remove_version_unit(version_unit_data.version_unit_id);
					}
					VER.show_version_editor({'data': CL._data, 'context': CL._context, 'container': CL._container});
					document.getElementById('scroller').scrollLeft = scroll_offset[0];
					document.getElementById('scroller').scrollTop = scroll_offset[1];
					return;
				}
			}
			alert('This data could not be deleted, please try again.');
		},

		get_version_unit_by_id: function (id) {
			var key, i;
			for (key in VER._version_data.data) {
				if (key === 'apparatus' || key.indexOf('additions') !== -1) {
					for (i = 0; i < VER._version_data.data[key].length; i += 1) {
						if (VER._version_data.data[key][i]._id === id) {
							return VER._version_data.data[key][i];
						}
					}
				}
			}
			return null;
		},

		remove_version_unit: function (unit_id) {
			var key, i, hit;
			hit = null;
			for (key in VER._version_data.data) {
				if (key === 'apparatus' || key.indexOf('additions') !== -1) {
					for (i = 0; i < VER._version_data.data[key].length; i += 1) {
						if (VER._version_data.data[key][i]._id === unit_id) {
							hit = i;
						}
					}
					if (hit !== null) {
						VER._version_data.data[key].splice(hit, 1);
						if (VER._version_data.data[key].length === 0) {
							delete VER._version_data.data[key];
						}
						break;
					}
				}
			}
		},

		edit_version_reading: function (version_unit_data, main_unit_data, pos) {
			VER.display_version_form(main_unit_data['app_id'], main_unit_data['unit_num'], pos, 
					function () {VER.load_version_data(version_unit_data, main_unit_data['app_id'])}); 
		},

		toggle_version_form: function () {
			var pos;
			if (document.getElementById('version_form').style.display == 'none') {
				document.getElementById('version_form').style.display = 'block';
				document.getElementById('toggle_version_form').innerHTML = '&#9650;';	
				//check expansion size and move accordingly
				pos = document.getElementById('version_form_div').getBoundingClientRect();
				if (pos.y + pos.height > window.innerHeight) {
					document.getElementById('version_form_div').style.top = (window.innerHeight - pos.height) - 10 + 'px';
				}
			} else {
				document.getElementById('version_form').style.display = 'none';
				document.getElementById('toggle_version_form').innerHTML = '&#9660;';
			}
		}, 

		toggle_ms_details_form: function () {
			var pos;
			if (document.getElementById('manuscript_details_form').style.display == 'none') {
				document.getElementById('manuscript_details_form').style.display = 'block';
				document.getElementById('toggle_manuscript_details_form').innerHTML = '&#9650;';	
				//check expansion size and move accordingly
				pos = document.getElementById('manuscript_details_form_div').getBoundingClientRect();
				if (pos.y + pos.height > window.innerHeight) {
					document.getElementById('manuscript_details_form_div').style.top = (window.innerHeight - pos.height) - 10 + 'px';
				}
			} else {
				document.getElementById('manuscript_details_form').style.display = 'none';
				document.getElementById('toggle_manuscript_details_form').innerHTML = '&#9660;';
			}
		},

		display_manuscript_details_form: function (callback) {
			var details_form, version_form, top, left;
			if (document.getElementById('manuscript_details_form_div')) {
				document.getElementsByTagName('body')[0].removeChild(document.getElementById('manuscript_details_form_div'));
			}

			MAG.AUTH.get_user_info({'success': function (user) {
				MAG._REQUEST.request('http://' + SITE_DOMAIN + '/collation/htmlfragments/manuscript_details_form.html', {
					'mime' : 'text',
					'success' : function (html) {
						details_form = document.createElement('div');
						details_form.setAttribute('class', 'dragdiv');
						details_form.id = 'manuscript_details_form_div';
						document.getElementsByTagName('body')[0].appendChild(details_form);
						details_form.innerHTML = html;
						DND.InitDragDrop(true, true);
						MAG.FORMS.populate_select([CL._project.versions[VER._version_language]], document.getElementById('ms_details_language_select'), undefined, undefined, CL._project.versions[VER._version_language], false);
						//populate witness selection for this language
						if (CL._project.version_subtypes[VER._version_language][user._id].length === 1) {
							document.getElementById('ms_details_subtype_select_label').style.display = 'inline';
							MAG.FORMS.populate_select(CL._project.version_subtypes[VER._version_language][user._id], document.getElementById('ms_details_subtype_select'), CL._project.version_subtypes[VER._version_language][user._id][0], undefined, undefined, false);
						} else if (CL._project.version_subtypes[VER._version_language][user._id].length > 0) {			   
							document.getElementById('ms_details_subtype_select_label').style.display = 'inline';
							MAG.FORMS.populate_select(CL._project.version_subtypes[VER._version_language][user._id], document.getElementById('ms_details_subtype_select'));
						} else {
							document.getElementById('ms_details_subtype_select_label').style.display = 'none';
						}
						if (callback) {
							callback();
						}
						//position the form relative to the parent form (about half way down and 1/3 right)
						version_form = document.getElementById('version_form_div');
						top = parseInt(version_form.style.top) + (version_form.offsetHeight/2);
						if (top + details_form.offsetHeight < window.innerHeight) {
							details_form.style.top = top + 'px';
						} else {
							details_form.style.top = (window.innerHeight - details_form.offsetHeight) - 10 + 'px';
						}
						left = parseInt(version_form.style.left) + (version_form.offsetWidth/3);
						if (left + details_form.offsetWidth < window.innerWidth) {
							details_form.style.left = left + 'px';
						} else {
							details_form.style.left = (window.innerWidth - details_form.offsetWidth) - 10 + 'px';
						}
						VER.add_ms_details_form_handlers();
					}});
			}});
		},

		display_version_form: function (app_id, unit_num, pos, callback) {
			var ver_form, left, rd;
			if (document.getElementById('version_form_div')) {
				document.getElementsByTagName('body')[0].removeChild(document.getElementById('version_form_div'));
			}
			ver_form = document.createElement('div');
			ver_form.setAttribute('class', 'dragdiv');
			ver_form.id = 'version_form_div';
			document.getElementsByTagName('body')[0].appendChild(ver_form);
			ver_form.style.top = '10px';
			left = pos.right + 10;
			if (left + ver_form.offsetWidth < window.innerWidth) {
				ver_form.style.left = (pos.right + 10) + 'px';
			} else {
				ver_form.style.left = (window.innerWidth - ver_form.offsetWidth) - 10 + 'px';
			}
			MAG.AUTH.get_user_info({'success': function (user) {
				MAG._REQUEST.request('http://' + SITE_DOMAIN + '/collation/htmlfragments/version_form.html', {
					'mime' : 'text',
					'success' : function (html) {
						var parents, all_parents, i;
						ver_form.innerHTML = html;
						DND.InitDragDrop(true, true);
						parents = [];
						if (typeof app_id !== 'undefined' && app_id.indexOf('apparatus') !== -1) { //only get parents if we are not an addition (if we are then new parents only)
							main_unit = CL._data[app_id][unit_num];
							document.getElementById('unit_indexes').innerHTML = 'unit ' + main_unit.start + ' to ' + main_unit.end;
							all_parents = main_unit.readings;
							for (i = 0; i < all_parents.length; i += 1) {
								if (all_parents[i].label !== 'zz' && all_parents[i].label !== 'zu') {
									if (all_parents[i].label.indexOf('/') === -1) {
										parents.push(JSON.parse(JSON.stringify(all_parents[i])));
									}
								}
							}			   
						}
						parents.push({'_id': 'new', 'label': 'new reading'});
						MAG.FORMS.populate_select(parents, document.getElementById('parent_select'), '_id', 'label');
						//populate language select (which is fixed at current language)
						MAG.FORMS.populate_select([CL._project.versions[VER._version_language]], document.getElementById('language_select'), undefined, undefined, CL._project.versions[VER._version_language], false);
						//populate witness selection for this language
						if (CL._project.version_subtypes[VER._version_language][user._id].length === 1) {
							document.getElementById('subtype_select_label').style.display = 'inline';
							MAG.FORMS.populate_select(CL._project.version_subtypes[VER._version_language][user._id], document.getElementById('subtype_select'), CL._project.version_subtypes[VER._version_language][user._id][0], undefined, undefined, false);
						} else if (CL._project.version_subtypes[VER._version_language][user._id].length > 0) {			   
							document.getElementById('subtype_select_label').style.display = 'inline';
							MAG.FORMS.populate_select(CL._project.version_subtypes[VER._version_language][user._id], document.getElementById('subtype_select'));
						} else {
							document.getElementById('subtype_select_label').style.display = 'none';
						}
						callback();
						VER.add_version_form_handlers(app_id);
					}});
			}});
		},

		prepare_version_form: function (app_id, unit_num) {
			var i, all_ends, main_unit;
			//populate unit end with all the end of unit markers after the start of this unit
			//only activate once a new parent is selected and if we are working with a top line unit
			if (app_id === 'apparatus') {
				main_unit = CL._data[app_id][unit_num];
				document.getElementById('start_unit_id').value = main_unit._id;
				document.getElementById('end_unit_id').value = main_unit._id;
				document.getElementById('app_line').value = 'apparatus';
				//display the end selection div
				document.getElementById('new_reading_extent_div').style.display = 'block';
				all_ends = [];
				for (i = unit_num; i < CL._data[app_id].length; i += 1) {
					all_ends.push({'id': CL._data[app_id][i]._id, 'end': CL._data[app_id][i].end})
				}
				MAG.FORMS.populate_select(all_ends, document.getElementById('unit_end'), 'id', 'end', main_unit._id, false);
			} else if (app_id.indexOf('apparatus') !== -1) {
				main_unit = CL._data[app_id][unit_num];
				document.getElementById('start_unit_id').value = main_unit._id;
				document.getElementById('end_unit_id').value = main_unit._id;
				document.getElementById('app_line').value = app_id;
			} else {
				main_unit = VER._version_data.data[app_id][unit_num];
				document.getElementById('start_unit_id').value = main_unit.start_unit_id;
				document.getElementById('end_unit_id').value = main_unit.end_unit_id;
				document.getElementById('app_line').value = app_id;
			}
		},

		load_version_data: function (version_unit_data, app_id) {
			var version_unit, version_reading, i, version_witnesses;
			version_unit = VER._version_data.data[version_unit_data['app_id']][version_unit_data['unit_num']];
			document.getElementById('start_unit_id').value = version_unit.start_unit_id;
			document.getElementById('end_unit_id').value = version_unit.end_unit_id;
			document.getElementById('version_unit_id').value = version_unit_data['version_unit_id'];
			document.getElementById('version_reading_id').value = version_unit_data['version_reading_id'];
			document.getElementById('app_line').value = version_unit_data['app_id'];
			version_reading = version_unit.readings[version_unit_data['reading_pos']];
			//add the parents
			if (version_reading.parent_readings.length === 0) {
				VER.add_parent('new', app_id);
			} else {
				for (i = 0; i < version_reading.parent_readings.length; i += 1) {
					VER.add_parent(version_reading.parent_readings[i], app_id);
				}
			}
			//add witnesses
			for (i = 0; i < version_reading.witnesses.length; i += 1) {
				version_witnesses = [version_reading.witnesses[i].language, '', ''];
				if (version_reading.witnesses[i].hasOwnProperty('subtype')) {
					version_witnesses[1] = version_reading.witnesses[i].subtype;
				}
				if (version_reading.witnesses[i].hasOwnProperty('modifier')) {
					version_witnesses[2] = version_reading.witnesses[i].modifier;
				}
				VER.add_witness(version_witnesses, 'version_witnesses');
			}
			//add the manuscript details
			if (version_reading.hasOwnProperty('manuscript_details')) {
				for (i = 0; i < version_reading.manuscript_details.length; i += 1) {
					VER.add_manuscript_details(version_reading.manuscript_details[i]);
				}
			}
			MAG.FORMS.populate_simple_form(version_reading, document.getElementById('version_form'));
		},

		add_ms_details_form_handlers: function () {
			if (document.getElementById('toggle_manuscript_details_form')) {
				$('#toggle_manuscript_details_form').off('click.toggle_ms_details_form');
				$('#toggle_manuscript_details_form').on('click.toggle_ms_details_form', function (event) {
					VER.toggle_ms_details_form();
					CL.disableEventPropagation(event);
				});
			}
			if (document.getElementById('versional_text')) {
				$('#versional_text').off('focus.remove_vt_error');
				$('#versional_text').on('focus.remove_vt_error', function () {
					MAG.ELEMENT.remove_className(document.getElementById('versional_text_label'), 'missing');
					MAG.ELEMENT.remove_className(document.getElementById('retroversion_label'), 'missing');
					MAG.ELEMENT.remove_className(document.getElementById('comment_label'), 'missing');
				});
			}
			if (document.getElementById('retroversion')) {
				$('#retroversion').off('focus.remove_retroversion_error');
				$('#retroversion').on('focus.remove_retroversion_error', function () {
					MAG.ELEMENT.remove_className(document.getElementById('versional_text_label'), 'missing');
					MAG.ELEMENT.remove_className(document.getElementById('retroversion_label'), 'missing');
					MAG.ELEMENT.remove_className(document.getElementById('comment_label'), 'missing');
				});
			}
			if (document.getElementById('comment')) {
				$('#comment').off('focus.remove_comment_error');
				$('#comment').on('focus.remove_comment_error', function () {
					MAG.ELEMENT.remove_className(document.getElementById('versional_text_label'), 'missing');
					MAG.ELEMENT.remove_className(document.getElementById('retroversion_label'), 'missing');
					MAG.ELEMENT.remove_className(document.getElementById('comment_label'), 'missing');
				});
			}
			if (document.getElementById('cancel_ms_details_button')) {
				MAG.EVENT.remove_event('cancel_ms_details_form');
				MAG.EVENT.add_event(document.getElementById('cancel_ms_details_button'), 'click', function(event) {
					document.getElementById('manuscript_details_form_div').parentNode.removeChild(document.getElementById('manuscript_details_form_div'));
				}, 'cancel_ms_details_form');
			}	
			if (document.getElementById('ms_details_add_witness')) {
				MAG.EVENT.remove_event('ms_details_add_witness');
				MAG.EVENT.add_event(document.getElementById('ms_details_add_witness'), 'click', 
						function(event) {
					var subtype_value, modifier_value, values;
					values = [document.getElementById('ms_details_language_select').value, '', ''];
					subtype_value = document.getElementById('ms_details_subtype_select').value;
					modifier_value = document.getElementById('ms_details_modifiers').value.trim();
					//at the very least we will always have a language so just add it
					if (subtype_value !== 'none') {
						values[1] = subtype_value;
					}
					if (modifier_value !== '') {
						values[2] = modifier_value;
					}
					VER.add_witness(values, 'ms_details_witnesses');
					document.getElementById('ms_details_subtype_select').value = 'none';
					document.getElementById('ms_details_modifiers').value = '';
					MAG.ELEMENT.remove_className(document.getElementById('ms_details_subtype_select_label'), 'missing');
					MAG.ELEMENT.remove_className(document.getElementById('ms_details_language_select_label'), 'missing');
					MAG.ELEMENT.remove_className(document.getElementById('ms_details_modifiers_label'), 'missing');
				}, 'ms_details_add_witness');
			}
			if (document.getElementById('add_ms_details_button')) {
				$('#add_ms_details_button').off('click.add_ms_details');
				$('#add_ms_details_button').on('click.add_ms_details', function () {
					var data, validation;
					validation = VER.validate_manuscript_details_form('manuscript_details_form');
					if (validation[0] === true) {
						data = MAG.FORMS.serialize_form('manuscript_details_form');
						if (document.getElementById('original_id') && document.getElementById('original_id').value !== '') {
							VER.add_manuscript_details(data, document.getElementById('original_id').value);
						} else {
							VER.add_manuscript_details(data);
						} 
					} else {
						VER.show_validation_errors(validation[1]);
					}
				});
			}
		},


		add_version_form_handlers: function (app_id) {
			if (document.getElementById('toggle_version_form')) {
				$('#toggle_version_form').off('click.toggle_version_form');
				$('#toggle_version_form').on('click.toggle_version_form', function (event) {
					VER.toggle_version_form();
					CL.disableEventPropagation(event);
				});
			}
			if (document.getElementById('version_reading_text')) {
				$('#version_reading_text').off('focus.remove_vrt_error');
				$('#version_reading_text').on('focus.remove_vrt_error', function () {
					MAG.ELEMENT.remove_className(document.getElementById('version_reading_text_label'), 'missing');
				});
			}
			if (document.getElementById('add_parent')) {
				MAG.EVENT.remove_event('add_parent');
				MAG.EVENT.add_event(document.getElementById('add_parent'), 'click', 
						function(event) {
					var parent_value;
					parent_value = document.getElementById('parent_select').value;
					VER.add_parent(parent_value, app_id);
				}, 'add_parent');
			}
			if (document.getElementById('add_witness')) {
				MAG.EVENT.remove_event('add_witness');
				MAG.EVENT.add_event(document.getElementById('add_witness'), 'click', 
						function(event) {
					var subtype_value, modifier_value, values;
					values = [document.getElementById('language_select').value, '', ''];
					subtype_value = document.getElementById('subtype_select').value;
					modifier_value = document.getElementById('modifiers').value.trim();
					//at the very least we will always have a language so just add it
					if (subtype_value !== 'none') {
						values[1] = subtype_value;
					}
					if (modifier_value !== '') {
						values[2] = modifier_value;
					}
					document.getElementById('subtype_select').value = 'none';
					document.getElementById('modifiers').value = '';
					MAG.ELEMENT.remove_className(document.getElementById('subtype_select_label'), 'missing');
					MAG.ELEMENT.remove_className(document.getElementById('language_select_label'), 'missing');
					MAG.ELEMENT.remove_className(document.getElementById('modifiers_label'), 'missing');
					VER.add_witness(values, 'version_witnesses');
				}, 'add_witness');
			}
			if (document.getElementById('manuscript_details_button')) {
				$('#manuscript_details_button').off('click.show_ms_details_form');
				$('#manuscript_details_button').on('click.show_ms_details_form', function () {
					VER.display_manuscript_details_form();
				});
			}
			if (document.getElementById('cancel_button')) {
				MAG.EVENT.remove_event('cancel_form');
				MAG.EVENT.add_event(document.getElementById('cancel_button'), 'click', function(event) {
					VER.remove_version_form();
				}, 'cancel_form');
			}	    
			if (document.getElementById('add_version_button')) {
				MAG.EVENT.remove_event('add_version_data');
				MAG.EVENT.add_event(document.getElementById('add_version_button'), 'click', function(event) {
					var validation;
					validation = VER.validate_version_form('version_form');
					if (validation[0] === true) {
						VER.process_version_data();
					} else {
						VER.show_validation_errors(validation[1]);
					}
				}, 'add_version_data');
			}
		},

		remove_validation_errors: function (ids) {
			var i;
			for (i = 0; i < ids.length; i += 1) {
				MAG.ELEMENT.remove_className(document.getElementById(ids[i]), 'missing');
			}
		},

		show_validation_errors: function (error_ids) {
			var i;
			for (i = 0; i < error_ids.length; i += 1) {
				MAG.ELEMENT.add_className(document.getElementById(error_ids[i]), 'missing');
			}
		},

		validate_manuscript_details_form: function (form_id) {
			var data, errors, witnesses;
			data = MAG.FORMS.serialize_form(form_id);
			errors = [];
			witnesses = VER._dict_values_to_list(data.witnesses);
			if (witnesses.length === 0) {
				errors.push('ms_details_language_select_label');
				errors.push('ms_details_subtype_select_label');
				errors.push('ms_details_modifiers_label');
			}
			if (!data.hasOwnProperty('versional_text') && !data.hasOwnProperty('retroversion') && !data.hasOwnProperty('comment')) {
				errors.push('versional_text_label');
				errors.push('retroversion_label');
				errors.push('comment_label');
			}
			if (errors.length === 0) {
				return [true];
			} else {
				return [false, errors];
			}
		},

		validate_version_form: function (form_id) {
			var data, errors, witnesses, parents;
			data = MAG.FORMS.serialize_form(form_id);
			errors = [];
			//general things
			//we must have at least one thing added to both the parent box and the witnesses box
			witnesses = VER._dict_values_to_list(data.witnesses);
			parents = VER._dict_values_to_list(data.parent_readings);
			//we are push label ids as errors because it is these we want to turn red
			if (witnesses.length === 0) {
				errors.push('language_select_label');
				errors.push('subtype_select_label');
				errors.push('modifiers_label');
			}
			if (parents.length === 0) {
				errors.push('parent_select_label');
			}
			//if the parent reading is 'new' then we must have an original text and either a German or English translation
			if (parents.length > 0 && parents.indexOf('new') !== -1) {
				if (!data.hasOwnProperty('version_reading_text')) {
					errors.push('version_reading_text_label');
				}
			}
			if (errors.length === 0) {
				return [true];
			} else {
				return [false, errors];
			}
		},

		remove_version_form: function () {
			var elems, i;
			elems = document.getElementsByClassName('version_selected');
			for (i = 0; i < elems.length; i += 1) {
				MAG.ELEMENT.remove_className(elems[i], 'version_selected');
			}
			if (document.getElementById('manuscript_details_form_div')) {
				document.getElementById('manuscript_details_form_div').parentNode.removeChild(document.getElementById('manuscript_details_form_div'));
			}
			document.getElementById('version_form_div').parentNode.removeChild(document.getElementById('version_form_div'));
		},

		_dict_values_to_list: function (dict) {
			var key, list;
			list = [];
			for (key in dict) {
				if (dict.hasOwnProperty(key)) {
					list.push(dict[key]);
				}
			}
			return list;
		},

		process_version_data: function () {
			var key, i, data, reading_data, app_line, version_unit_id;
			data = MAG.FORMS.serialize_form('version_form');
			reading_data = {};
			reading_data.witnesses = VER._dict_values_to_list(data.witnesses);
			delete data.witnesses;
			reading_data.parent_readings = VER._dict_values_to_list(data.parent_readings);
			if (reading_data.parent_readings.indexOf('new') !== -1) {
				reading_data.parent_readings.splice(reading_data.parent_readings.indexOf('new'), 1);
			}
			delete data.parent_readings;
			if (data.hasOwnProperty('version_reading_id')) {
				//then we are editing existing data
				reading_data['_id'] = data['version_reading_id'];
				delete data.version_reading_id;	
			}
			if (data.hasOwnProperty('manuscript_details')) {
				reading_data.manuscript_details = [];
				for (i = 0; i < data.manuscript_details.length; i += 1) {
					reading_data.manuscript_details[i] = JSON.parse(unescape(data.manuscript_details[i].jsondata));
				}
				delete data.manuscript_details;
			}
			//start_unit_id, end_unit_id and app_line are unit level not reading level
			unit_level_keys = ['start_unit_id', 'end_unit_id', 'app_line', 'version_unit_id', 'version_reading_id', 'unit_end'];
			for (key in data) {
				if (data.hasOwnProperty(key)) {
					if (unit_level_keys.indexOf(key) === -1) {
						reading_data[key] = data[key];
						delete data[key];
					}
				}
			}	    
			if (data.hasOwnProperty('version_unit_id')) {
				data._id = data.version_unit_id;
				delete data.version_unit_id;
			}
			app_line = data.app_line;
			delete data.app_line;
			if (data.hasOwnProperty('_id') && reading_data.hasOwnProperty('_id')) {
				//if we have a reading id and a unit id then we are replacing a reading
				VER.replace_existing_version_reading(app_line, data, reading_data);
			} else {
				//if we don't have a reading id then we are either adding a reading to an existing unit or we are making a new unit
				//first check to see if we have altered the end extent of our unit and if so this will override the end_unit_id value
				if (data.hasOwnProperty('unit_end')) {
					data.end_unit_id = data.unit_end;   
				} 
				if (reading_data.parent_readings[0] === 'new_add_before') {
					delete data.start_unit_id;
					delete data.end_unit_id;
				}
				VER.add_new_version_reading(app_line, data, reading_data);
			}
		},

		replace_existing_version_reading: function (app_line, unit_data, reading_data) {
			var unit, reading_pos, scroll_offset;
			scroll_offset = [document.getElementById('scroller').scrollLeft,
			                 document.getElementById('scroller').scrollTop];
			unit = VER.find_version_unit_by_id(unit_data._id, app_line);
			if (unit === null) {
				VER.add_new_version_reading(app_line, unit_data, reading_data);
			} else {
				reading_pos = VER.find_version_reading_pos_by_id(unit, reading_data._id);
				if (reading_pos === null) {
					VER.add_new_version_reading(app_line, unit_data, reading_data);
				} else {
					unit.readings.splice(reading_pos, 1, reading_data);
				}
			}    
			VER.remove_version_form();
			VER.show_version_editor({'data': CL._data, 'context': CL._context, 'container': CL._container});
			document.getElementById('scroller').scrollLeft = scroll_offset[0];
			document.getElementById('scroller').scrollTop = scroll_offset[1];
		},

		make_new_addition_unit: function () {
			return {'_id' : MD5(VER._version_language + 'additionbefore' + Date.now()), 'readings': [], 'start': 1, 'end': 1};
		},

		add_new_version_reading: function (app_line, unit_data, reading_data) {
			var unit, addition_line, scroll_offset;
			scroll_offset = [document.getElementById('scroller').scrollLeft,
			                 document.getElementById('scroller').scrollTop];
			if (!unit_data.hasOwnProperty('start_unit_id')) {
				//then we are looking at a special addition
				unit = VER.make_new_addition_unit();
				addition_line = 'special_adds';
				if (!VER._version_data.data.hasOwnProperty(addition_line)) {
					VER._version_data.data[addition_line] = [];
				} 
				VER._version_data.data[addition_line].push(unit);
				//sort
				VER._version_data.data[addition_line].sort(CL.compare_start_indexes);
			} else {
				unit = VER.find_unit_by_start_and_end_ids(app_line, unit_data);
				if (unit === null) {
					//make a new unit and add it to the data structure and assign to unit variable
					if (unit_data.start_unit_id === unit_data.end_unit_id) { //add it to the apparatus line
						unit = VER.make_new_unit(unit_data);
						if (!VER._version_data.data.hasOwnProperty('apparatus')) {
							VER._version_data.data['apparatus'] = [];
						}
						VER._version_data.data['apparatus'].push(unit);
						//sort
						VER._version_data.data['apparatus'].sort(CL.compare_start_indexes);
					} else { 
						//work out what addition line you need to add it to
						unit = VER.make_new_unit(unit_data);
						addition_line = VER.find_first_available_addition_line(unit);
						if (!VER._version_data.data.hasOwnProperty(addition_line)) {
							VER._version_data.data[addition_line] = [];
						} 
						VER._version_data.data[addition_line].push(unit);
						//sort
						VER._version_data.data[addition_line].sort(CL.compare_start_indexes);
					}
				}
			}
			if (!reading_data.hasOwnProperty('_id')) {
				//add one
				if (reading_data.hasOwnProperty('version_reading') && reading_data.version_reading.hasOwnProperty('versional_text')) {
					reading_data._id = MD5(unit._id + reading_data.witnesses.join('') + reading_data.parent_readings.join('') + reading_data.version_reading.versional_text + Date.now());
				} else {
					reading_data._id = MD5(unit._id + reading_data.witnesses.join('') + reading_data.parent_readings.join('') + Date.now());
				}
			}
			unit.readings.push(reading_data);
			VER.remove_version_form();
			VER.show_version_editor({'data': CL._data, 'context': CL._context, 'container': CL._container});
			document.getElementById('scroller').scrollLeft = scroll_offset[0];
			document.getElementById('scroller').scrollTop = scroll_offset[1];	    
		},

		find_first_available_addition_line: function (unit) {
			var add_lines, i, j, clash_found, highest_line;
			add_lines = VER.get_ordered_add_lines(VER._version_data);
			if (add_lines.length === 0) {
				return 'additions';
			}
			for (i = 0; i < add_lines.length; i += 1) {
				clash_found = false;
				for (j = 0; j < VER._version_data.data[add_lines[i]].length; j += 1) {
					if (unit.start <= VER._version_data.data[add_lines[i]][j].end   
							&& unit.end >= VER._version_data.data[add_lines[i]][j].start) {
						clash_found = true;
					}
				}
				if (!clash_found) {
					break;
				}
			}
			if (clash_found) {
				//it we get to the end and we are still finding clashes then we need to add a new line
				highest_lines = add_lines[add_lines.length-1];
				if (highest_lines === 'additions') {
					return 'additions2';
				} else {
					return 'additions' + (parseInt(highest_lines.replace('additions', '')) + 1);
				}
			} else {
				return add_lines[i];
			}
		},

		make_new_unit: function (unit_data) {
			var unit;
			unit = {'start_unit_id': unit_data.start_unit_id, 'end_unit_id': unit_data.end_unit_id, 'readings': []};
			unit.start = VER.find_main_apparatus_unit_by_id(unit_data.start_unit_id).start;
			unit.end = VER.find_main_apparatus_unit_by_id(unit_data.end_unit_id).end;
			unit._id = MD5(unit.start_unit_id + unit.end_unit_id + VER._version_language + Date.now());
			return unit;
		},

		find_main_apparatus_unit_by_id: function (id) {
			var key, unit;
			for (key in CL._data) {
				if (key.indexOf('apparatus') !== -1) {
					unit = CL.find_unit_by_id(key, id);
					if (unit) {
						return unit;
					}
				}
			}
		},

		find_version_reading_pos_by_id: function (unit, id) {
			var i;
			for (i = 0; i < unit.readings.length; i += 1) {
				if (unit.readings[i]._id === id) {
					return i;
				}
			}
			return null;
		},

		find_unit_by_start_and_end_ids: function (app_line, unit_data) {
			var i, key;
			//if start_unit_id and end_unit_id are the same then the version unit it will be/go in apparatus
			if (unit_data.start_unit_id === unit_data.end_unit_id) {
				if (VER._version_data.data.hasOwnProperty('apparatus')) {
					for (i = 0; i < VER._version_data.data.apparatus.length; i += 1) {
						if (VER._version_data.data.apparatus[i].start_unit_id === unit_data.start_unit_id 
								&& VER._version_data.data.apparatus[i].end_unit_id === unit_data.end_unit_id) {
							return VER._version_data.data.apparatus[i];
						}
					}
				}
			} else { //if not it will be/go in one of the addition lines
				for (key in VER._version_data.data) {
					if (key.indexOf('additions') !== -1) {
						for (i = 0; i < VER._version_data.data[key].length; i += 1) {
							if (VER._version_data.data[key][i].start_unit_id === unit_data.start_unit_id 
									&& VER._version_data.data[key][i].end_unit_id === unit_data.end_unit_id) {
								return VER._version_data.data[key][i];
							}
						}
					}
				}
			}
			return null;
		},

		find_version_unit_by_id: function (id, app_line) {
			var i;
			for (i = 0; i < VER._version_data.data[app_line].length; i += 1) {
				if (VER._version_data.data[app_line][i]._id === id) {
					return VER._version_data.data[app_line][i];
				}
			}
			return null;
		},

		add_manuscript_details: function (data, original_id) {
			var container, table, row, display_string, display_list, display_witnesses, display_witnesses_string, 
			witness_string, i, language, subtype, modifier, rows;
			if (typeof original_id !== 'undefined') {
				if (document.getElementById(original_id)) {
					document.getElementById(original_id).parentNode.parentNode.parentNode.removeChild(document.getElementById(original_id).parentNode.parentNode);
				}
			}
			container = document.getElementById('manuscript_details_div');
			table = document.getElementById('manuscript_details_table');
			row = document.createElement('tr');
			row.id = 'manuscript_details_container_' + VER._ms_details_count;

			display_list = [];
			if (data.hasOwnProperty('retroversion')) {
				display_list.push(data.retroversion);
			}
			if (data.hasOwnProperty('versional_text')) {
				display_list.push(data.versional_text);
			}
			if (data.hasOwnProperty('english_translation')) {
				display_list.push(data.english_translation);
			}
			if (data.hasOwnProperty('german_translation')) {
				display_list.push(data.german_translation);
			}
			if (data.hasOwnProperty('comment')) {
				display_list.push(data.comment);
			}
			display_string =  display_list.join(', ');
			//display witnesses in ( )
			display_witnesses = [];
			for (i = 0; i < data.witnesses.length; i += 1) {
				language = data.witnesses[i].language;
				if (data.witnesses[i].hasOwnProperty('subtype')) {
					subtype = data.witnesses[i].subtype;
				} else {
					subtype = null;
				}
				if (data.witnesses[i].hasOwnProperty('modifier')) {
					modifier = data.witnesses[i].modifier;
				} else {
					modifier = null;
				}
				witness_string = '<b>' + language + '</b>';
				if (subtype || modifier) {
					witness_string += ':';
					if (subtype) {
						witness_string += subtype;
					}
					if (modifier) {
						witness_string += '<sup>' + modifier + '</sup>';
					}
				}
				display_witnesses.push(witness_string);
			}
			display_witnesses_string = '(' + display_witnesses.join(', ') + ')';
			row.innerHTML = '<td class="rowhandler"><div class="drag row">+</div></td><td><fieldset id="manuscript_details_' 
				+ VER._ms_details_count + '" class="data_group objectlist">'
				+ '<span title="edit this entry" class="added_ms_details" id="added_mansucript_details_'
				+ VER._ms_details_count + '">' + display_string + ' ' + display_witnesses_string +  '</span>'
				+ '<input id="manuscript_details_' 
				+ VER._ms_details_count + '_jsondata" name="manuscript_details_' 
				+ VER._ms_details_count + '_jsondata" type="hidden" value="' + escape(JSON.stringify(data)) + '" />'
				+ '<img class="delete_logo" height="15px" width="15px" title="Remove manuscript details" src="/citations/images/delete.png" id="remove_manuscript_details_' 
				+ VER._ms_details_count + '"/><br/>'
				+ '</fieldset></td>';
			table.appendChild(row);	    
			if (container.style.display === 'none') {
				container.style.display = 'block';
			}
			$('#remove_manuscript_details_' + VER._ms_details_count).on('click', function (event) {
				document.getElementById('manuscript_details_table').removeChild(event.target.parentNode.parentNode.parentNode);
				rows = document.getElementById('manuscript_details_table').getElementsByTagName('TR');
				if (rows.length === 0) {
					document.getElementById('manuscript_details_div').style.display = 'none';
				}
			});
			$('#added_mansucript_details_' + VER._ms_details_count).on('click', function (event) {
				VER.edit_added_manuscript_details(event.target.parentNode.parentNode.getElementsByTagName('INPUT')[0].value, event.target.parentNode.id);
			});
			VER._ms_details_count += 1;
			if (document.getElementById('manuscript_details_form_div')) {
				document.getElementById('manuscript_details_form_div').parentNode.removeChild(document.getElementById('manuscript_details_form_div'));
			}
			var rd = REDIPS.drag;
			rd.init('manuscript_details_div');

		},

		edit_added_manuscript_details: function (data_string, original_id) {
			var data;
			data = JSON.parse(unescape(data_string));
			data.original_id = original_id;
			VER.display_manuscript_details_form(function () {VER.load_manuscript_details_data(data)});
		},

		load_manuscript_details_data: function (data) {
			var i, witnesses;
			//add witnesses
			for (i = 0; i < data.witnesses.length; i += 1) {
				witnesses = [data.witnesses[i].language, '', ''];
				if (data.witnesses[i].hasOwnProperty('subtype')) {
					witnesses[1] = data.witnesses[i].subtype;
				}
				if (data.witnesses[i].hasOwnProperty('modifier')) {
					witnesses[2] = data.witnesses[i].modifier;
				}
				VER.add_witness(witnesses, 'ms_details_witnesses');
			}
			MAG.FORMS.populate_simple_form(data, document.getElementById('manuscript_details_form'));
		},


		add_witness: function (value, div_id) {
			var w, wselect, wextra, wcontainer, wdiv, wstring;
			if (value !== 'none') {
				wcontainer = document.getElementById(div_id);
				w = document.createElement('span');
				w.id = 'witness_' + VER._witness_count;
				wstring = '<b>' + value[0] + '</b>';
				if (value[1] !== '' || value[2] !== '') {
					wstring += ':' + value[1] + '<sup>' + value[2] + '</sup>';
				}
				w.innerHTML = '<fieldset id="witnesses_' 
					+ VER._witness_count + '" class="data_group objectlist"><span class="added_witness">' + wstring + '</span>' 
					+ '<input class="hidden_witness" type="hidden" name="witnesses_' 
					+ VER._witness_count + '_language" id="witnesses_' 
					+ VER._witness_count + '_langauge" value="' + value[0] + '"/>'
					+ '<input class="hidden_witness" type="hidden" name="witnesses_' 
					+ VER._witness_count + '_subtype" id="witnesses_' 
					+ VER._witness_count + '_subtype" value="' + value[1] + '"/>'
					+ '<input class="hidden_witness" type="hidden" name="witnesses_' 
					+ VER._witness_count + '_modifier" id="witnesses_' 
					+ VER._witness_count + '_modifier" value="' + value[2] + '"/>'
					+ '<img class="delete_logo" height="15px" width="15px" title="Remove witness" src="/citations/images/delete.png" id="remove_witness_' 
					+ VER._witness_count + '"/></fieldset>';
				wcontainer.appendChild(w);
				if (wcontainer.style.display === 'none') {
					wcontainer.style.display = 'block';
				}
				MAG.EVENT.addEventListener(document.getElementById('remove_witness_' + VER._witness_count), 'click', function (event) {
					VER.remove_added_element(event.target.parentNode.parentNode, div_id);
				});
				VER._witness_count += 1;
			}
		},

		add_parent: function (value, app_id) {
			var i, p, pselect, pcontainer, pdiv, option_text;
			pselect = document.getElementById('parent_select');
			if (value !== 'none') {
				pdiv = document.getElementById('parent_readings_div');
				pcontainer = document.getElementById('parent_readings');
				for (i = 0; i < pselect.options.length; i += 1) {
					if (pselect.options[i].value === value) {
						option_text = pselect.options[i].text;
					}
				}
				p = document.createElement('span');
				p.id = 'parent_' + VER._parent_count;
				p.innerHTML = '<span class="added_parent">' + option_text + '</span>'
				+ '<input class="hidden_parent" type="hidden" name="parent_readings_' 
				+ VER._parent_count + '" id="parent_readings_' 
				+ VER._parent_count + '" value="' + value + '"/>'
				+ '<img class="delete_logo" height="15px" width="15px" title="Remove parent" src="/citations/images/delete.png" id="remove_parent_' 
				+ VER._parent_count + '"/><br/>';
				pcontainer.appendChild(p);
				if (pdiv.style.display === 'none') {
					pdiv.style.display = 'block';
				}
				MAG.EVENT.addEventListener(document.getElementById('remove_parent_' + VER._parent_count), 'click', function (event) {
					VER.fix_available_options(event.target.parentNode, 'delete');
					VER.remove_added_element(event.target.parentNode, 'parent_readings_div');
				});
				VER.fix_available_options(p, 'add');
				if (app_id === 'apparatus' && value === 'new') {
					//undisable the unit_end select box and label and the reading text stuff
					document.getElementById('unit_end').removeAttribute('disabled');
					MAG.ELEMENT.remove_className(document.getElementById('unit_end_label'), 'disabled');
				}
				if (value === 'new') {
					document.getElementById('version_reading_text').removeAttribute('disabled');
					MAG.ELEMENT.remove_className(document.getElementById('version_reading_text_label'), 'disabled');
				}
				VER._parent_count += 1;
				MAG.ELEMENT.remove_className(document.getElementById('parent_select_label'), 'missing');
				pselect.value = 'none';
			}
		},

		fix_available_options: function (target, operation) {
			var container, i, parents, pselect, value;
			pselect = document.getElementById('parent_select');
			container = target.parentNode;
			parents = document.getElementsByClassName('hidden_parent');
			if (operation === 'delete') {
				if (parents.length === 1) {
					//if we are about to delete the last added parent then reenable everything
					for (i = 0; i < pselect.options.length; i += 1) {
						pselect.options[i].removeAttribute('disabled');
					}
				} else {
					//otherwise we are just removing one of a list of parents so we just need to unenable that parent
					value = document.getElementById(target.id.replace('parent_', 'parent_readings_')).value;
					for (i = 0; i < pselect.options.length; i += 1) {
						if (pselect.options[i].value === value) {
							pselect.options[i].removeAttribute('disabled');
						}			
					}
				}
				//since we have no readings added any more and the unit_end select is only
				//allowed if we have a 'new' reading then we now need to disable it and
				//return its value to the default which is in the hidden element with the
				//id 'end_unit_id'
				document.getElementById('version_reading_text').setAttribute('disabled', 'disabled');
				document.getElementById('version_reading_text').value = '';
				MAG.ELEMENT.add_className(document.getElementById('version_reading_text_label'), 'disabled');
				document.getElementById('unit_end').setAttribute('disabled', 'disabled');
				document.getElementById('unit_end').value = document.getElementById('end_unit_id').value;
				MAG.ELEMENT.add_className(document.getElementById('unit_end_label'), 'disabled');

			} else if (operation === 'add') {
				value = document.getElementById(target.id.replace('parent_', 'parent_readings_')).value;
				if (value === 'new') {
					//then disable it and everything else
					for (i = 0; i < pselect.options.length; i += 1) {
						if (pselect.options[i].value !== 'none') {
							pselect.options[i].setAttribute('disabled', 'disabled');
						}
					}
				} else {
					//disable taget and new
					for (i = 0; i < pselect.options.length; i += 1) {
						if (pselect.options[i].value === value || pselect.options[i].value === 'new') {
							pselect.options[i].setAttribute('disabled', 'disabled');
						}
					}
				}
			}
		},

		remove_added_element: function (target, container_id) {
			var container, parent, only_text_nodes, i;
			parent = target.parentNode;
			container = document.getElementById(container_id);
			parent.removeChild(target);
			only_text_nodes = true;
			for (i = 0; i < parent.childNodes.length; i += 1) {
				if (typeof parent.childNodes[i].tagName !== 'undefined') {
					only_text_nodes = false;
				}
			}
			if (only_text_nodes === true) {
				container.style.display = 'none';
			}
		},

		highlight_version_witness: function (witness) {
			var scroll_offset;
			scroll_offset = [document.getElementById('scroller').scrollLeft,
			                 document.getElementById('scroller').scrollTop];
			VER._highlighted_version = witness;
			VER.show_version_editor({'data': CL._data, 'context': CL._context, 'container': CL._container, 'highlighted_version' : witness});
			document.getElementById('scroller').scrollLeft = scroll_offset[0];
			document.getElementById('scroller').scrollTop = scroll_offset[1];
		},

		highlight_witness: function (witness) {
			var scroll_offset;
			scroll_offset = [document.getElementById('scroller').scrollLeft,
			                 document.getElementById('scroller').scrollTop];
			CL._highlighted = witness;
			VER.show_version_editor({'data': CL._data, 'context': CL._context, 'container': CL._container, 'highlighted_wit' : witness});
			document.getElementById('scroller').scrollLeft = scroll_offset[0];
			document.getElementById('scroller').scrollTop = scroll_offset[1];
			if (witness !== 'none') {
				CL.get_highlighted_text(witness);
			}
		},

		get_previous_verse_link: function () {
			MAG.EVENT.addEventListener(document.getElementById('previous_verse'), 'click', function () {
				CL._services.get_adjoining_verse(CL._context, true, function (prev_context) {
					var criteria;
					criteria = {'project' : CL._project._id, 'context': prev_context};
					VER.do_load_version_editor(criteria);
				});
			});
		},

		get_next_verse_link: function () {
			MAG.EVENT.addEventListener(document.getElementById('next_verse'), 'click', function () {
				CL._services.get_adjoining_verse(CL._context, false, function (next_context) {
					var criteria;
					criteria = {'project' : CL._project._id, 'context': next_context};
					VER.do_load_version_editor(criteria);
				});
			});
		},

		get_corresponding_version_unit: function (unit_id) {
			var key, i;
			if (!$.isEmptyObject(VER._version_data)) {
				for (key in VER._version_data.data) {
					if (key.indexOf('apparatus') !== -1) {
						for (i = 0; i < VER._version_data.data[key].length; i += 1) {
							if (unit_id === VER._version_data.data[key][i].start_unit_id 
									&& unit_id === VER._version_data.data[key][i].end_unit_id) {
								return VER._version_data.data[key][i];
							}
						}
					}
				}
			}
			return null;
		},

		get_corresponding_other_version_units: function (unit_id) {
			var key, i, j, other_versions;
			other_versions = [];
			for (i = 0; i < VER._other_versions.length; i += 1) {
				for (key in VER._other_versions[i].data) {
					if (key.indexOf('apparatus') !== -1) {
						for (j = 0; j < VER._other_versions[i].data[key].length; j += 1) {
							if (unit_id === VER._other_versions[i].data[key][j].start_unit_id
									&& unit_id === VER._other_versions[i].data[key][j].end_unit_id) {
								other_versions.push(VER._other_versions[i].data[key][j]);
							}
						}
					}
				}
			}
			return other_versions;
		},

		//data in this case is a list of readings, the unit id is in options.unit_id
		get_unit_data: function (data, id, format, start, end, options) {
			var i, html, j, k, decisions, rows, cells, row_list, temp, events, max_length, row_id, other_ver_units, 
			type, subrow_id, colspan, hand, text, label, ver_unit, has_version_data, labels, hover_wits,
			v_language, v_subtype, v_modifier, classes, class_string, version_string, OR_rules, key;
			html = [];
			row_list = [];
			events = {};
			if (options.hasOwnProperty('highlighted_wit')) {
				hand = options.highlighted_wit.split('|')[1];
			} else {
				hand = null;
			}
			OR_rules = CL._get_rule_classes(undefined, undefined, 'value', ['identifier', 'keep_as_main_reading', 'suffixed_label', 'suffixed_reading']);
			for (key in OR_rules) {
				if (OR_rules.hasOwnProperty(key) && OR_rules[key][1] === false) {
					delete OR_rules[key];
				}
			}
			if (options.hasOwnProperty('highlighted_version') && options.highlighted_version !== 'none') {
				temp = options.highlighted_version.split('|');
				v_language = temp[0].trim();
				v_subtype = temp[1].trim();
				v_modifier = temp[2].trim();
			} else {
				v_language = null;
				v_subtype = null;
				v_modifier = null;
			}
			if (format === 'version') {
				ver_unit = VER.get_corresponding_version_unit(options.unit_id);
				other_ver_units = VER.get_corresponding_other_version_units(options.unit_id);
			} else {
				ver_unit = {'readings': data};
			}
			html.push('<td class="mark start_' + start + ' " colspan="' + (end - start + 1) + '">');
			if (format === 'version_additions') {
				html.push('<div class="drag_div" id="addition_drag_unit_' + id + '">');//TODO: why do we need drag units here?
				html.push('<table class="variant_unit" id="addition_unit_' + id + '">');
			} else if (format === 'other_version_additions') {
				html.push('<div class="drag_div" id="addition_drag_unit_' + id + '">');//TODO: why do we need drag units here?
				html.push('<table class="other_version_unit" id="addition_unit_' + id + '">');
			} else {
				html.push('<div class="drag_div" id="drag_unit_' + id + '">');//TODO: why do we need drag units here?
				html.push('<table class="variant_unit" id="variant_unit_' + id + '">');
			}
			if (format === 'version') { //there could also be 'version_additions' for new readings
				for (i = 0; i < data.length; i += 1) {
					row_id = 'variant_unit_' + id + '_row_' + i;
					row_list.push(row_id);
					//get the text early because if is is deleted or overlapped we just don't want to display it at all because no versions can be added
					text = CL.extract_display_text(data[i], i, data.length, options.unit_id, options.app_id);
					if (text !== 'system_gen_deleted' && text !== 'system_gen_overlapped') { 
						//have a list of classes which then get added
						classes = [];
						//work out what classes need to be applied to the row
						if (i === 0) {
							//add the header row which just contains the collapse/expand triangle
							html.push('<tr><td colspan="3"><span id="toggle_variant_' + id + '" class="triangle">&#9650;</span></td></tr>');
							classes.push('top');
						}
						if (data[i].witnesses.indexOf(hand) != -1) {
							classes.push('highlighted');
						}
						has_version_data = false;
						//check all readings in the version unit
						if (ver_unit !== null) {
							for (j = 0; j < ver_unit.readings.length; j += 1) {
								if (ver_unit.readings[j].parent_readings.length === 1 && data[i]._id === ver_unit.readings[j].parent_readings[0]) {
									has_version_data = true;
									//check to see if any witnesses match the highlighed ones
									if (typeof v_language !== 'null' || typeof v_subtype !== 'null' || typeof v_modifier !== 'null') {
										for (k = 0; k < ver_unit.readings[j].witnesses.length; k += 1) {
											if (typeof v_language !== 'null' && v_language !== '' 
												&& !ver_unit.readings[j].witnesses[k].hasOwnProperty('subtype')
												&& !ver_unit.readings[j].witnesses[k].hasOwnProperty('modifier')) {
												if (ver_unit.readings[j].witnesses[k].language === v_language) {
													classes.push('highlighted_version');
												}
											} else if (typeof v_subtype !== 'null' && v_subtype !== '') {
												if (ver_unit.readings[j].witnesses[k].subtype === v_subtype) {
													classes.push('highlighted_version');
												}
											} else if (typeof v_modifier !== 'null' && v_modifier !== '') {
												if (ver_unit.readings[j].witnesses[k].modifier === v_modifier) {
													classes.push('highlighted_version');
												}
											}
										}
									}
								}
							}
						}
						if (has_version_data === true) {
							classes.push('version_parent');
						}
						//check all other version units
						has_other_version_data = false;
						for (j = 0; j < other_ver_units.length; j += 1) {
							for (k = 0; k < other_ver_units[j].readings.length; k += 1) {
								if (other_ver_units[j].readings[k].parent_readings.length === 1 
										&& data[i]._id === other_ver_units[j].readings[k].parent_readings[0]) {
									//data[i].witnesses.push.apply(data[i].witnesses, );
									has_other_version_data = true;
								}
							}
						}
						if (has_other_version_data == true) {
							classes.push('other_version_parent');
						}
						class_string = classes.join(' ');
						html.push('<tr id="' + row_id + '" class="' + class_string + '">');
						//what labels need to be used?
						reading_label = CL.get_reading_label(i, data[i], OR_rules);
						reading_suffix = CL.get_reading_suffix(data[i], OR_rules);

						html.push('<td id="' + row_id + '_label"><div class="spanlike">' + reading_label);
						html.push('</div></td>');
						html.push('<td class="main_reading"><div class="spanlike">');
						html.push(text);       
						if (reading_suffix !== '') {
							html.push(' ' + reading_suffix);
						}
						html.push('</div>');
						if (data[i].hasOwnProperty('subreadings')) {
							html.push('<table class="subreading_unit" id="subreading_unit_' + id + '_row_' + i + '">');
							overlapped = false;
							if (data[i].hasOwnProperty('overlap_status')) {
								overlapped = true;
							}

							temp = OR.get_subunit_data(data[i].subreadings, i, id, data[i].label, 'subreading', hand, overlapped);
							html.push.apply(html, temp[0]);
							row_list.push.apply(row_list, temp[1]);

							html.push('</table>');
						}
						html.push('</td>');
						html.push('</tr>');
					}
				}
			}
			//now add any readings which are only in the versional data
			if (ver_unit !== null) {
				for (i = 0; i < ver_unit.readings.length; i += 1) {
					if (format === 'version_additions') {
						row_id = 'addition_unit_' + id + '_versionrow_' + i;
						classes = ['version_parent'];
					} else if (format === 'other_version_additions') {
						row_id = 'other_addition_unit_' + id + '_versionrow_' + i;
						classes = ['other_version_parent'];
					} else {
						row_id = 'variant_unit_' + id + '_versionrow_' + i;
						classes = ['version_parent'];
					}
					hover_wits = [];
					for (j = 0; j < ver_unit.readings[i].witnesses.length; j += 1) {
						version_string = ver_unit.readings[i].witnesses[j].language;
						if (ver_unit.readings[i].witnesses[j].hasOwnProperty('subtype') || ver_unit.readings[i].witnesses[j].hasOwnProperty('modifier')) {
							version_string += ':';
						}
						if (ver_unit.readings[i].witnesses[j].hasOwnProperty('subtype')) {
							version_string += ver_unit.readings[i].witnesses[j].subtype;
						}
						if (ver_unit.readings[i].witnesses[j].hasOwnProperty('modifier')) {
							version_string += ver_unit.readings[i].witnesses[j].modifier;
						}
						hover_wits.push(version_string);
					}
					events[row_id] = hover_wits.join(', ');
					if (ver_unit.readings[i].hasOwnProperty('version_reading_text')) {
						text = ver_unit.readings[i].version_reading_text;
					} else {
						text = 'Multiple';
					}
					if (typeof v_language !== 'null' || typeof v_subtype !== 'null' || typeof v_modifier !== 'null') {
						for (j = 0; j < ver_unit.readings[i].witnesses.length; j += 1) {
							if (typeof v_language !== 'null' && v_language !== ''
								&& !ver_unit.readings[i].witnesses[j].hasOwnProperty('subtype')
								&& !ver_unit.readings[i].witnesses[j].hasOwnProperty('modifier')) {
								if (ver_unit.readings[i].witnesses[j].language === v_language) {
									classes.push('highlighted_version');
								}
							} else if (typeof v_subtype !== 'null' && v_subtype !== '') {
								if (ver_unit.readings[i].witnesses[j].subtype === v_subtype) {
									classes.push('highlighted_version');
								}
							} else if (typeof v_modifier !== 'null' && v_modifier !== '') {
								if (ver_unit.readings[i].witnesses[j].modifier === v_modifier) {
									classes.push('highlighted_version');
								}
							}
						}
					}
					if (ver_unit.readings[i].parent_readings.length > 1) {	
						labels = [];
						for (j = 0; j < data.length; j += 1) {
							if (ver_unit.readings[i].parent_readings.indexOf(data[j]._id) !== -1) {
								labels.push(data[j].label);
							}
						}
						html.push('<tr id="' + row_id + '" class="' + classes.join(' ') + '"><td>' + labels.join('/') + '.</td><td class="version_main_reading">' + text + '</td></tr>');
					} else if (ver_unit.readings[i].parent_readings.length === 0) {
						html.push('<tr id="' + row_id + '" class="' + classes.join(' ') + '"><td>? </td><td class="version_main_reading">' + text + '</td></tr>');
					}
				}
			}
			html.push('</table>');
			html.push('</div>');
			html.push('</td>');
			return [html, row_list, events];  
		},



//		Menu stuff

		load_no_project_menu: function () {
			//for the versional interface there is no option to work outside of a project 
			//so here we just need to say that the user is not recognised as a versionist in any of the editing projects
			CL._container.innerHTML = '<p>This user is not recognised as a versionist in any of the editing projects in progress. Please speak to you managing editor to be given access.</p>';
			SPN.remove_loading_overlay();
		},

		get_language_cookie: function () {
			var cookie_pairs, pair, i, name;
			cookie_pairs = document.cookie.split(';');
			name = 'version='
				for (i = 0; i < cookie_pairs.length; i += 1) {
					pair = cookie_pairs[i].trim();
					if (pair.indexOf(name) === 0) {
						return pair.substring(name.length, pair.length);
					}
				}
			return '';
		},

		load_single_project_menu: function (project, user) {
			var remembered, criteria;
			criteria = {'versionists.all' : {'$in': [user._id]}};
			remembered = VER.get_language_cookie();
			//now we need to check if this versionist is responsible for a single language or needs to select one
			if (project.versionists[user._id].length === 1) {
				VER.do_load_single_project_menu(project, user, project.versionists[user._id][0], false);
			} else if (remembered !== '' && project.versionists[user._id].indexOf(remembered) !== -1) {
				//if a versionist gets to this point 
				//we need to if the user is a versionist in multiple projects and use
				//the appropriate flag when calling the version menu so we get the switch project button
				MAG.REST.apply_to_list_of_resources('editing_project', {'criteria': criteria, 'success': function (response) {
					if (response.results.length === 1) {
						VER.do_load_single_project_menu(project, user, remembered, true, false);
					} else {
						VER.do_load_single_project_menu(project, user, remembered, true, true);
					}
				}});
			} else {
				VER.load_language_choice_menu(project, user);
			}
		},

		load_language_choice_menu: function (project, user) {
			var html;
			document.getElementById('version_language').innerHTML = '';
			html = [];
			html.push('<form id="language_select_form">');
			html.push('<label for="language">Select the language you want to work in from the list below: ');
			html.push('<select id="language"></select></label><br/>');
			html.push('<p>If you would like the browser to remember you are working in this language for the rest of this session (until your browser is closed) then you can tick the \'Remember language\' box below.</p>');
			html.push('<p>By ticking the box and clicking on continue you are giving you permisison for a cookie to be stored in your browser.</p>');
			html.push('<label for="remember_lanuage">Remember language: <input type="checkbox" id="remember_language"/></label>');
			html.push('<br/><br/><input type="button" id="language_select_button" value="Continue"/>');
			html.push('</form>');
			document.getElementById('container').innerHTML = html.join('');
			MAG.FORMS.populate_select(project.versionists[user._id], document.getElementById('language'));
			MAG.EVENT.addEventListener(document.getElementById('language_select_button'), 'click', function () {
				VER.select_working_language(project, user, document.getElementById('language').value);
			});
			//remove the switch language button if there is one
			if (document.getElementById('switch_language_button')) {
				document.getElementById('footer').removeChild(document.getElementById('switch_language_button'));
			}
			SPN.remove_loading_overlay();
		},

		select_working_language: function (project, user, language) {
			criteria = {'_id': project._id, 'versionists.all' : {'$in': [user._id]}};
			MAG.REST.apply_to_list_of_resources('editing_project', {
				'criteria': criteria, 
				'success': function (response) {
					if (response.results.length === 0) { //there is no project with this id in which this user is a verionist
						document.cookie = "version=; path=/collation/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
						VER.load_no_project_menu();
					} else if (response.results[0].versionists[user._id].indexOf(language) !== -1) {
						if (document.getElementById('remember_language').checked === true) {
							document.cookie="version=" + language + ';  path=/collation/';
						}
						VER.do_load_single_project_menu(project, user, language, true);
					} else {
						document.cookie = "version=; path=/collation/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
						VER.load_no_project_menu();
					}
				}});
		},

		do_load_single_project_menu: function (project, user, language, language_select, project_select) {
			var lang_button, project_button, bk, replaces, status_summary_button;
			CL._project = {'name' : project.project, 
					'_id' : project._id, 
					'rule_classes' : project.regularisation_classes, 
					'book_name' : project.book_name, 
					'versions': project.versions, 
					'versionists': project.versionists,
					'version_subtypes': project.version_subtypes};
			VER._version_language = language;
			document.getElementById('version_language').innerHTML = VER._version_language;
			bk = project.book;
			if (bk < 10) {
				bk = 'B0' + bk;
			} else {
				bk = 'B' + bk;
			}
			document.getElementById('project_name').innerHTML = CL._project.name;
			replaces = {'bk' : bk,
					'project1' : project._id,
					'book_name' : project.book_name,
					'version_language' : VER._version_language};

			MAG._REQUEST.request('http://' + SITE_DOMAIN + '/collation/versions/verse_select_menu.html', {
				'mime' : 'text',
				'success' : function (html) {
					document.getElementById('container').innerHTML = MAG.TEMPLATE.substitute(html, replaces);
					document.getElementById('add_versional_evidence')
					MAG.EVENT.remove_event('add_evidence');
					MAG.EVENT.add_event(document.getElementById('add_versional_evidence'), 'click', function () {
						VER.load_version_editor(); }, 'add_evidence');
					SPN.remove_loading_overlay();
				}
			});
			//append the switch project button
			if (project_select) {
				project_button = document.createElement('input');
				project_button.setAttribute('type', 'button');
				project_button.setAttribute('class', 'left_foot');
				project_button.setAttribute('value', 'Switch project');
				project_button.setAttribute('id', 'switch_project_button');
				document.getElementById('footer').appendChild(project_button);
			}
			//append the switch language button
			if (language_select) {
				lang_button = document.createElement('input');
				lang_button.setAttribute('type', 'button');
				lang_button.setAttribute('class', 'left_foot');
				lang_button.setAttribute('value', 'Switch language');
				lang_button.setAttribute('id', 'switch_language_button');
				document.getElementById('footer').appendChild(lang_button);
			}
			VER.add_footer_handlers(project, user);
		},


		add_footer_handlers: function (project, user) {
			if (document.getElementById('switch_project_button')) {
				MAG.EVENT.remove_event('switch_project');
				MAG.EVENT.add_event(document.getElementById('switch_project_button'), 'click', function () {
					MENU.load_project_select_menu(user, {'versionists.all' : {'$in': [user._id]}}, 'versions')}, 'switch_project');
			}
			if (document.getElementById('switch_language_button')) {
				MAG.EVENT.remove_event('switch_language');
				MAG.EVENT.add_event(document.getElementById('switch_language_button'), 'click', function () {
					VER.load_language_choice_menu(project, user)}, 'switch_language');
			} 
			/*if (document.getElementById('status_summary_button')) {
		MAG.EVENT.remove_event('show_status_summary');
		MAG.EVENT.add_event(document.getElementById('status_summary_button'), 'click', function () {
		    VER.display_status_summary(project, user)}, 'show_status_summary');
	    }*/
		},


		load_version_editor: function () {
			var book, chapter, verse, criteria, ref;
			book = document.getElementById('book').value;
			chapter = document.getElementById('chapter').value;
			verse = document.getElementById('verse').value;
			if (book !== 'none' && !CL.is_blank(chapter) && !CL.is_blank(verse)) {
				ref = book + 'K' + chapter + 'V' + verse;
				CL._context = ref;
				criteria = {'project' : CL._project._id, 'context': ref};
				VER.do_load_version_editor(criteria);
			}
		},

		do_load_version_editor: function (criteria) {
			var user_id, other_version_criteria, temp;
			SPN.show_loading_overlay();
			CL._context = criteria.context;
			//remove header message
			document.getElementById('message_panel').innerHTML = '';
			MAG.AUTH.get_user_info({'success': function (user) {
				user_id = user._id;
				if (CL._project.versionists.hasOwnProperty('subversionists') && CL._project.versionists.subversionists.indexOf(user_id) !== -1) {
					VER._subversionist = true;
				}
				//get the id of any Greek (main language) apparatus
				MAG.REST.apply_to_list_of_resources('main_apparatus', {'criteria': criteria, 'fields': [], 'success': function (apparatus_ids) {
					if (apparatus_ids.results.length > 1) {
						VER.load_no_verse_page('Something has gone wrong. There are two instances of ' 
								+ CL._context 
								+ ' in the main apparatus collection.<br/>'
								+ 'Please contact your managing editor so this can be investigated.', {'container': CL._container});		    
					} else if (apparatus_ids.results.length === 0) {
						VER.load_no_verse_page(CL._context + ' has not yet been approved by the managing editor.', {'container': CL._container});
					} else {
						//get the actual Greek language apparatus (for some reason trying to do this as a list makes it too large for nginx to return
						MAG.REST.apply_to_resource('main_apparatus', apparatus_ids.results[0]._id, {'success': function (apparatus) {
							CL._data = apparatus.structure;
							//we have exactly 1 instance of this verse in the main_apparatus table
							//so add language version to the criteria and look in the versional_data table
							delete criteria['_fields']; //_fields gets added by magpy and we must delete it
							criteria['language'] = VER._version_language;
							criteria['user'] = user_id;
							MAG.REST.apply_to_list_of_resources('version_data', {'force_reload': true, 'criteria': criteria, 'success': function (versions) {
								if (versions.results.length > 1) {
									VER.load_no_verse_page('Something has gone wrong. There are two instances of '
											+ CL._context 
											+ ' in the versional data. <br/>'
											+ 'Please contact your managing editor so this can be investigated.', {'container': CL._container});
								} else {
									if (versions.results.length === 0) {
										//we haven't got any data yet for this verse in this language
										temp = CL.get_context_dict(CL._context);
										VER._version_data = {'_model': 'version_data', 
												'_id': CL._context + '_' + VER._version_language + '_' + user_id + '_' + CL._project._id,
												'context': CL._context, 
												'chapter': temp.chapter,
												'book_number': temp.book,
												'verse': temp.verse,
												'user': user_id,
												'language': VER._version_language, 
												'project': CL._project._id,
												'data': {}};
									} else {
										//we have data already for this verse in this language
										//non submitted versions will be editable
										//submitted versions will be read only
										VER._version_data = versions.results[0];
									}
									//Now get any other submitted versions in other languages and store them all in a list
									other_version_criteria = {'context': CL._context, 'submitted': {'$exists': true}};
									MAG.REST.apply_to_list_of_resources('version_data', {'force_reload': true, 'criteria': other_version_criteria, 'success': function (other_versions) {
										var i;
										//now delete the actual version we are editing
										for (i = 0; i < other_versions.results.length; i += 1) {
											if (other_versions.results[i].user !== user_id || other_versions.results[i].language !== VER._version_language) {
												VER._other_versions.push(other_versions.results[i]);
											}
										}
										VER.show_version_editor({'context': CL._context, 'container': CL._container});
									}});
								} 
							}});
						}});			
					}
				}});
			}});
		},

		load_no_verse_page: function (message, options) {
			var container;
			document.getElementById('verse_ref').innerHTML = CL._context;
			if (options.hasOwnProperty('container')) {
				container = options.container;
			} else {
				container = document.getElementsByTagName('body')[0];
			}
			container.innerHTML = '<div id="scroller"></div><div id="single_witness_reading"></div>';
			document.getElementById('scroller').innerHTML = '<table>'
				+ '<tr>'
				+ '<td class="nav" id="previous_verse">&larr;</td>'
				+ '<td></td>'
				+ '<td class="nav" id="next_verse">&rarr;</td>'
				+ '</tr>'
				+ '<tr>'
				+ '<td></td>'
				+ '<td>'
				+ message
				+ '</td>'
				+ '<td></td>'
				+ '</tr>'
				+ '</table>';
			if (document.getElementById('previous_verse')) {
				VER.get_previous_verse_link();
			}
			if (document.getElementById('next_verse')) {
				VER.get_next_verse_link();
			}
			document.getElementById('footer').innerHTML = '';
			SPN.remove_loading_overlay();
			return;
		},

	};
}());