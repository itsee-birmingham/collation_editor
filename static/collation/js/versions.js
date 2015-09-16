var VER = (function () {
    
    return {
        hello: function () {
         
        },
        
        _selected_unit: null,
        _version_data: {},
        _version_language: null,
        _parent_count: 0,
        _witness_count: 0,
        _highlighted_version: 'none',

	check_login_status: function () {
	    var criteria;
	    SPN.show_loading_overlay();
	    CL._services.show_login_status();
	    CL._container = document.getElementById('container');
	    MAG.AUTH.get_user_info({'success': function (user) {
		criteria = {'versionists.all' : {'$in': [user._id]}};
		//we are using the ITSEE interface
		//so display the correct menu for the circumstances
		MENU.choose_menu_to_display(user, criteria, 'versions');
	    }, 'error': function (response) {
		CL._container.innerHTML = '<p>Please login using the link in the top right corner to use the editing interface</p>';
		SPN.remove_loading_overlay();
	    }});
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
	    new_overlap_options, overlaps, html_footer, event_rows, row, i, key, hands_and_sigla;
	    console.log(JSON.parse(JSON.stringify(CL._data)));
	    if (typeof options === 'undefined') {
        	options = {};
            }
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
            SimpleContextMenu.setup({'preventDefault' : true, 'preventForms' : false})
            if (!VER._version_data.hasOwnProperty('submitted')) {
        	//attach right click menus
                SimpleContextMenu.attach('variant_unit', function () {return VER.make_menu('unit')});
                SimpleContextMenu.attach('version_parent', function () {return VER.make_menu('version_parent')});
            } else {
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
            //TODO: here sandwich any version 'additions' between the top line apparatus and the overlapping variants
            add_ids = VER.get_ordered_add_lines();
            for (i = 0; i < add_ids.length; i += 1) {
        	num = add_ids[i].replace('additions', '');
        	new_overlap_options = VER.calculate_unit_lengths(add_ids[i], overlap_options);
        	overlaps = CL.get_overlap_layout(VER._version_data.data[add_ids[i]], num, 'version_additions', header[1], new_overlap_options);
        	html.push.apply(html, overlaps[0]);
                temp[2].push.apply(temp[2], overlaps[1]);
                if (typeof overlaps[2] !== 'undefined') {
                    temp[3] = CL.merge_dicts(temp[3], overlaps[2]);
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
            CL._services.show_login_status();
            document.getElementById('header').className = 'versional_editor_header';
            container.innerHTML = '<div id="scroller"><table class="collation_overview">'
                + html.join('') + '</table></div><div id="single_witness_reading"></div>';
            
            //sort out footer stuff
            document.getElementById('scroller').style.height = window.innerHeight - document.getElementById('footer').offsetHeight - document.getElementById('header').offsetHeight - 40 + 'px';
            document.getElementById('single_witness_reading').style.bottom = document.getElementById('footer').offsetHeight + 'px';
            footer_html = [];
            footer_html.push('<input class="left_foot" id="expand_collapse_button" type="button" value="expand all"/>'); 
            footer_html.push('<select id="highlighted_version" name="highlighted_version"></select>');
            footer_html.push('<select id="highlighted" name="highlighted"></select>');
            footer_html.push('<input id="save" type=button value="Save"/>');
            footer_html.push('<input id="submit" type=button value="Submit"/>');
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
                    CL._add_hover_events(row);
                }
            }
            unit_events = temp[3];
            for (key in unit_events) {
                if (unit_events.hasOwnProperty(key)) {
                    row = document.getElementById(key);
                    if (row) {
                        CL._add_hover_events(row, unit_events[key]);
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
            MAG.EVENT.remove_event('highlight_witness');
            MAG.EVENT.add_event(document.getElementById('highlighted'), 'change', function (event) {               
                VER.highlight_witness(event.target.value);
            }, 'highlight_witness');
            MAG.EVENT.remove_event('highlight_version_witness');
            MAG.EVENT.add_event(document.getElementById('highlighted_version'), 'change', function (event) {
                VER.highlight_version_witness(event.target.value);
            }, 'highlight_version_witness');
            
            MAG.EVENT.remove_event('save_version');
            MAG.EVENT.add_event(document.getElementById('save'), 'click', function (event) {
        	VER.save_version();
            }, 'save_version');
            MAG.EVENT.remove_event('submit_version');
            MAG.EVENT.add_event(document.getElementById('submit'), 'click', function (event) {
        	VER.submit_version();
            }, 'submit_version');
            SPN.remove_loading_overlay();
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
	
	//this is a reworking of the same function in SV namespace
	//needs reworking as we store start and end id for versional data rather than embedded the ids of the overlapped units
	//in the top line apparatus (this is because we want to keep the verional data standoff for now)
	//reworking this function should allow the same layout generator to be used for both
	calculate_unit_lengths: function (add_id, options) {
	    var i, j, top_line, id, start_id, end_id, start, add_line, original_column_lengths, length, gap_before, first_hit,
	    last_end, gap_counts, highest_gap, gap_after, found_end, previous_unit_gap_after, previous_unit_start, previous_unit_end;
	    top_line = CL._data.apparatus;
	    add_line = VER._version_data.data[add_id];
	    
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
	
	get_ordered_add_lines: function () {
            var key, numbers, i, add_ids;
            numbers = [];
            add_ids = [];
            if (VER._version_data.data.hasOwnProperty('additions')) {
        	add_ids.push('additions');
            }
            for (key in VER._version_data.data) {
                if (VER._version_data.data.hasOwnProperty(key)) {
                    if (key.match(/additions\d/g) !== null) {
                        numbers.push(parseInt(key.replace('additions', '')));
                    }
                }
            }
            numbers.sort();
            for (i = 0; i < numbers.length; i += 1) {
        	add_ids.push('additions' + numbers[i]);
            }
            return add_ids;
        },
	
	get_reading_witnesses: function (unit_id, reading_id) {
	    var version_witnesses, key, i, j, k, version_string;
	    version_witnesses = [];
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
					    version_string = VER._version_data.data[key][i].readings[j].witnesses[k].language;
					    if (VER._version_data.data[key][i].readings[j].witnesses[k].hasOwnProperty('subtype') || VER._version_data.data[key][i].readings[j].witnesses[k].hasOwnProperty('modifier')) {
						version_string += ':';
					    }
					    if (VER._version_data.data[key][i].readings[j].witnesses[k].hasOwnProperty('subtype')) {
						version_string += VER._version_data.data[key][i].readings[j].witnesses[k].subtype;
					    }
					    if (VER._version_data.data[key][i].readings[j].witnesses[k].hasOwnProperty('modifier')) {
						version_string += VER._version_data.data[key][i].readings[j].witnesses[k].modifier;
					    }
					    version_witnesses.push(version_string);
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
                    		var element, div, data_type, unit_number, app_id, elems, i;
                                element = SimpleContextMenu._target_element;
                                div = CL._get_specified_ancestor(element, 'DIV');
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
                                VER.display_version_form(app_id, unit_number, function () {VER.prepare_form(app_id, unit_number)});
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
                    		var element, tr, elems, unit_data;
                    		element = SimpleContextMenu._target_element;
                    		tr = CL._get_specified_ancestor(element, 'TR');
                    		unit_data = VER.get_version_unit_data(tr.id);
                    		VER.edit_version_reading(unit_data[0], unit_data[1]);
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
		    console.log('additional reading')
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
		    muregex = /^variant_unit_(\d)_(?:app_(\d)_)?row_(\d)$/;
		    match = muregex.exec(id);
		    if (match) {
			console.log('existing reading')
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
	
	edit_version_reading: function (version_unit_data, main_unit_data) {
	    VER.display_version_form(main_unit_data['app_id'], main_unit_data['unit_num'], 
		    function () {VER.load_version_data(version_unit_data, main_unit_data['app_id'])}); 
	},
	
	display_version_form: function (app_id, unit_num, callback) {
	   var ver_form;
	   //work out where to put it - it can be moved so its not critical
//	   window_width = window.innerWidth;
//           left_pos = rd.td.current.offsetLeft + rd.obj.redips.container.offsetParent.offsetLeft - document.getElementById('scroller').scrollLeft
//           if (left_pos + parseInt(document.getElementById('reg_form').style.width) >= window_width) {
//               left_pos = (window_width - parseInt(document.getElementById('reg_form').style.width) - 20);
//           }
//           //hardcoded this now as a fail safe against overshooting the bottom of the page, extra tests could be added if you have time.
//           //document.getElementById('reg_form').style.top = (rd.td.current.offsetTop + rd.obj.redips.container.offsetParent.offsetTop - document.getElementById('scroller').scrollTop) + 'px';
//           document.getElementById('reg_form').style.left = left_pos + 'px';
	   
	   
	   
	   if (document.getElementById('version_form_div')) {
	       document.getElementsByTagName('body')[0].removeChild(document.getElementById('version_form_div'));
	   }
	   ver_form = document.createElement('div');
	   ver_form.setAttribute('class', 'dragdiv');
	   ver_form.id = 'version_form_div';
	   document.getElementsByTagName('body')[0].appendChild(ver_form);
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
			   all_parents = main_unit.readings;
			   for (i = 0; i < all_parents.length; i += 1) {
			       if (all_parents[i].label !== 'zz' && all_parents[i].label !== 'zu') {
				   parents.push(JSON.parse(JSON.stringify(all_parents[i])));
			       }
			   }
		       }
		       parents.push({'_id': 'new', 'label': 'new reading'});
		       MAG.FORMS.populate_select(parents, document.getElementById('parent_select'), '_id', 'label');
		       //populate language select (which is fixed at current language)
		       MAG.FORMS.populate_select([CL._project.versions[VER._version_language]], document.getElementById('language_select'), undefined, undefined, CL._project.versions[VER._version_language], false);
		       //populate witness selection for this language
		       MAG.FORMS.populate_select(CL._project.version_subtypes[VER._version_language][user._id], document.getElementById('subtype_select'));
		       callback();
		       VER.add_version_form_handlers(app_id);
		   }});
	   }});
	   
	},
	
	prepare_form: function (app_id, unit_num) {
	    var i, all_ends, main_unit;
	    //populate unit end with all the end of unit markers after the start of this unit
            //only activate once a new parent is selected and if we are working with a top line unit
            if (app_id === 'apparatus') {
                main_unit = CL._data[app_id][unit_num];
                document.getElementById('start_unit_id').value = main_unit._id;
                document.getElementById('end_unit_id').value = main_unit._id;
                document.getElementById('app_line').value = 'apparatus';
                //display the end selection div
                document.getElementById('end_selection_div').style.display = 'block';
                all_ends = [];
                for (i = unit_num; i < CL._data[app_id].length; i += 1) {
            	all_ends.push({'id': CL._data[app_id][i]._id, 'end': CL._data[app_id][i].end})
                }
                MAG.FORMS.populate_select(all_ends, document.getElementById('unit_end'), 'id', 'end', main_unit._id, false);
            } else if (app_id.indexOf('apparatus') !== -1) {
                main_unit = CL._data[app_id][unit_num];
                document.getElementById('start_unit_id').value = main_unit._id;
                document.getElementById('end_unit_id').value = main_unit._id;
                document.getElementById('app_line').value = 'apparatus';
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
    	    	VER.add_witness(version_witnesses);
            }
            MAG.FORMS.populate_simple_form(version_reading, document.getElementById('version_form'));
            if (version_reading.hasOwnProperty('version_reading') && version_reading.version_reading.hasOwnProperty('publish') && version_reading.version_reading.publish === true) {
        	document.getElementById('publish').value = 'true';
            }        
            //synch checkbox
            if (document.getElementById('publish').value === 'true') {
        	document.getElementById('publish_checkbox').checked = true;
            } else {
        	document.getElementById('publish_checkbox').checked = false;
            }
	},
	
	add_version_form_handlers: function (app_id) {
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
                    		VER.add_witness(values);		
                    	}, 'add_witness');
            }
	    if (document.getElementById('cancel_button')) {
		MAG.EVENT.remove_event('cancel_form');
		MAG.EVENT.add_event(document.getElementById('cancel_button'), 'click', function(event) {
		    VER.remove_form();
		}, 'cancel_form');
	    }
	    if (document.getElementById('publish_checkbox')) {
		MAG.EVENT.remove_event('publish_toggle');
		MAG.EVENT.add_event(document.getElementById('publish_checkbox'), 'change', function(event) {
		    if (document.getElementById('publish_checkbox').checked === true) {
			document.getElementById('publish').value = 'true';
		    } else {
			document.getElementById('publish').value = 'false';
		    }
		}, 'publish_toggle');
	    }
	    if (document.getElementById('add_version_button')) {
		MAG.EVENT.remove_event('add_version_data');
		MAG.EVENT.add_event(document.getElementById('add_version_button'), 'click', function(event) {
		    var validation;
		    validation = VER.validate_form('version_form');
		    if (validation[0] === true) {
			VER.process_version_data();
		    } else {
			VER.show_validation_errors(validation[1]);
		    }
		}, 'add_version_data');
	    }
	    if (document.getElementById('version_reading_versional_text')) {
		MAG.EVENT.remove_event('check_versional_text_entry');
		MAG.EVENT.add_event(document.getElementById('version_reading_versional_text'), 'focus', function(event) {
		    VER.remove_validation_errors(['versional_text_label']);
		}, 'check_versional_text_entry');
	    }
	    if (document.getElementById('version_reading_english_translation')) {
		MAG.EVENT.remove_event('check_english_translation_text_entry');
		MAG.EVENT.add_event(document.getElementById('version_reading_english_translation'), 'focus', function(event) {
			VER.remove_validation_errors(['english_translation_label', 'german_translation_label']);
	    	}, 'check_english_translation_text_entry');
	    }
	    if (document.getElementById('version_reading_german_translation')) {
		MAG.EVENT.remove_event('check_german_translation_text_entry');
		MAG.EVENT.add_event(document.getElementById('version_reading_german_translation'), 'focus', function(event) {
		    VER.remove_validation_errors(['english_translation_label', 'german_translation_label']);
	    	}, 'check_german_translation_text_entry');
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
	
	validate_form: function (form_id) {
	    var data, errors, witnesses, parents;
	    data = MAG.FORMS.serialize_form(form_id);
	    console.log(data)
	    errors = [];
	    //general things
	    //we must have at least one thing added to both the parent box and the witnesses box
	    witnesses = VER._dict_values_to_list(data.witnesses);
	    parents = VER._dict_values_to_list(data.parent_readings);
	    //we are push label ids as errors because it is these we want to turn red
	    if (witnesses.length === 0) {
		errors.push('subtype_select_label');
	    }
	    if (parents.length === 0) {
		errors.push('parent_select_label');
	    }
	    //if the parent reading is 'new' then we must have an original text and either a German or English translation
	    if (parents.length > 0 && parents.indexOf('new') !== -1) {
		if (!data.hasOwnProperty('version_reading')) {
		    errors.push('versional_text_label');
		    errors.push('english_translation_label');
		    errors.push('german_translation_label');
		} else {
		    if (!data.version_reading.hasOwnProperty('versional_text')) {
			errors.push('version_reading_versional_text');
		    }
		    if (!data.version_reading.hasOwnProperty('english_translation') && !data.version_reading.hasOwnProperty('german_translation')) {
			//one of these must be supplied
			errors.push('english_translation_label');
			errors.push('german_translation_label');
		    }
		}
	    }
	    if (errors.length === 0) {
		return [true];
	    } else {
		return [false, errors];
	    }
	},
	
	remove_form: function () {
	    var elems, i;
	    elems = document.getElementsByClassName('version_selected');
	    for (i = 0; i < elems.length; i += 1) {
		MAG.ELEMENT.remove_className(elems[i], 'version_selected');
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
	    var key, data, reading_data, app_line, version_unit_id;
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
	    //start_unit_id, end_unit_id and app_line are unit level not reading level
	    unit_level_keys = ['start_unit_id', 'end_unit_id', 'app_line', 'publish', 'version_unit_id', 'version_reading_id', 'unit_end'];
	    for (key in data) {
		if (data.hasOwnProperty(key)) {
		    if (unit_level_keys.indexOf(key) === -1) {
			reading_data[key] = data[key];
			delete data[key];
		    }
		}
	    }
	    if (reading_data.hasOwnProperty('version_reading')) {
		reading_data.version_reading.publish = data.publish;
	    }
	    delete data.publish;
	    
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
	    VER.remove_form();
	    VER.show_version_editor({'data': CL._data, 'context': CL._context, 'container': CL._container});
            document.getElementById('scroller').scrollLeft = scroll_offset[0];
            document.getElementById('scroller').scrollTop = scroll_offset[1];
	},
	
	add_new_version_reading: function (app_line, unit_data, reading_data) {
	    var unit, addition_line, scroll_offset;
	    scroll_offset = [document.getElementById('scroller').scrollLeft,
                             document.getElementById('scroller').scrollTop];
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
	    if (!reading_data.hasOwnProperty('_id')) {
		//add one
		if (reading_data.hasOwnProperty('version_reading') && reading_data.version_reading.hasOwnProperty('versional_text')) {
		    reading_data._id = MD5(unit._id + reading_data.witnesses.join('') + reading_data.parent_readings.join('') + reading_data.version_reading.versional_text + Date.now());
		} else {
		    reading_data._id = MD5(unit._id + reading_data.witnesses.join('') + reading_data.parent_readings.join('') + Date.now());
		}
	    }
	    unit.readings.push(reading_data);
	    VER.remove_form();
	    VER.show_version_editor({'data': CL._data, 'context': CL._context, 'container': CL._container});
            document.getElementById('scroller').scrollLeft = scroll_offset[0];
            document.getElementById('scroller').scrollTop = scroll_offset[1];	    
	},
	
	find_first_available_addition_line: function (unit) {
	    var add_lines, i, j, clash_found, highest_line;
	    add_lines = VER.get_ordered_add_lines();
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
		    if (typeof unit !== 'null') {
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

	add_witness: function (value) {
	    var w, wselect, wextra, wcontainer, wdiv, wstring;
	    wselect = document.getElementById('subtype_select');
	    if (value !== 'none') {
		wextra = document.getElementById('modifiers');
		wdiv = document.getElementById('version_witnesses');
		wcontainer = document.getElementById('version_witnesses');
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
		if (wdiv.style.display === 'none') {
		    wdiv.style.display = 'block';
		}
		MAG.EVENT.addEventListener(document.getElementById('remove_witness_' + VER._witness_count), 'click', function (event) {
		    VER.remove_added_element(event.target.parentNode.parentNode, 'version_witnesses');
		});
		VER._witness_count += 1;
		MAG.ELEMENT.remove_className(document.getElementById('subtype_select_label'), 'missing');
		wselect.value = 'none';
		wextra.value = '';
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
		    //undisable the unit_end select box and label
		    document.getElementById('unit_end').removeAttribute('disabled');
		    MAG.ELEMENT.remove_className(document.getElementById('unit_end_label'), 'disabled');
		}
		if (value === 'new') {
		    //check and make read only the publish checkbox
		    document.getElementById('publish_checkbox').checked = true;
		    document.getElementById('publish_checkbox').setAttribute('disabled', 'disabled');
		    document.getElementById('publish').value = 'true';
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
		document.getElementById('unit_end').setAttribute('disabled', 'disabled');
		document.getElementById('unit_end').value = document.getElementById('end_unit_id').value;
		MAG.ELEMENT.add_className(document.getElementById('unit_end_label'), 'disabled');
		//also since we have no readings selected and 'publish_checkbox' is only compulsory when we
		//have a 'new' reading selected then we can undisable that and uncheck it for safety
		//also keep our hidden 'publish' value up to date
		document.getElementById('publish_checkbox').removeAttribute('disabled');
		document.getElementById('publish_checkbox').checked = false;
		document.getElementById('publish').value = 'false';
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
	    var context, bk, ch, v, prevCh, prevV;
	    context = CL._context;
	    bk = context.substring(1, 3);
	    ch = parseInt(context.substring(4, context.indexOf('V')), 10);
	    v = parseInt(context.substring(context.indexOf('V') + 1), 10);
	    prevCh = ch;
	    prevV = v;
	    MAG.REST.apply_to_resource('work', 'NT_B' + bk, {'success': function (response) {
		if (v === 1 && ch !== 1) {
		    prevCh = ch - 1;
		    prevV = response.verses_per_chapter[prevCh];
		} else if (v > 1) {
		    prevV = v - 1;
		}
		if (prevCh !== ch || prevV !== v) {
		    MAG.EVENT.addEventListener(document.getElementById('previous_verse'), 'click', function () {
			ref = 'B' + bk + 'K' + prevCh + 'V' + prevV; 
		    	CL._context = ref;
			criteria = {'project' : CL._project._id, 'context.book': parseInt(bk), 'context.chapter': prevCh, 'context.verse': prevV};
			VER.do_load_version_editor(criteria);
		    });
		} else {
		    document.getElementById('previous_verse').innerHTML = '';
		}
	    }});
	},

	get_next_verse_link: function () {
	    var context, bk, ch, v, nextCh, nextV;
	    context = CL._context;
	    bk = context.substring(1, 3);
	    ch = parseInt(context.substring(4, context.indexOf('V')), 10);
	    v = parseInt(context.substring(context.indexOf('V') + 1), 10);
	    nextCh = ch;
	    nextV = v;
	    MAG.REST.apply_to_resource('work', 'NT_B' + bk, {'success': function (response) {
		if (v + 1 <= response.verses_per_chapter[ch]) {
		    nextCh = ch;
		    nextV = v + 1;
		} else if (ch !== response.chapters) {
		    nextCh = ch + 1;
		    nextV = 1;
		}
		if (nextCh !== ch || nextV !== v) {
		    MAG.EVENT.addEventListener(document.getElementById('next_verse'), 'click', function () {
			ref = 'B' + bk + 'K' + nextCh + 'V' + nextV; 
		    	CL._context = ref;
			criteria = {'project' : CL._project._id, 'context.book': parseInt(bk), 'context.chapter': nextCh, 'context.verse': nextV};
			VER.do_load_version_editor(criteria);
		    });
		} else {
		    document.getElementById('next_verse').innerHTML = '';
		}
	    }});
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
	
	//data in this case is a list of readings, the unit id is in options.unit_id
	get_unit_data: function (data, id, format, start, end, options) {
	    var i, html, j, k, decisions, rows, cells, row_list, temp, events, max_length, row_id, 
	    type, subrow_id, colspan, hand, text, label, ver_unit, has_version_data, labels, hover_wits,
	    v_language, v_subtype, v_modifier, classes, class_string, version_string;
	    html = [];
	    row_list = [];
	    events = {};
            if (options.hasOwnProperty('highlighted_wit')) {
                hand = options.highlighted_wit.split('|')[1];
            } else {
                hand = null;
            }
            if (options.hasOwnProperty('highlighted_version') && options.highlighted_version !== 'none') {
        	console.log(options.highlighted_version)
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
            } else {
        	ver_unit = {'readings': data};
            }
            html.push('<td class="mark start_' + start + ' " colspan="' + (end - start + 1) + '">');
            if (format === 'version_additions') {
        	html.push('<div class="drag_div" id="addition_drag_unit_' + id + '">');
                html.push('<table class="variant_unit" id="addition_unit_' + id + '">');
            } else {
                html.push('<div class="drag_div" id="drag_unit_' + id + '">');
                html.push('<table class="variant_unit" id="variant_unit_' + id + '">');
            }
            if (format === 'version') {
        	for (i = 0; i < data.length; i += 1) {
        	    row_id = 'variant_unit_' + id + '_row_' + i;
        	    row_list.push(row_id);
        	    //get the text early because if is is deleted or overlapped we just don't want to display it at all
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
        		class_string = classes.join(' ');
        		html.push('<tr id="' + row_id + '" class="' + class_string + '">');
        		label = data[i].label;
        		//should never happen in the version editor since we are squelching these but no harm in leaving it for now
        		if (label === 'zz') {
        		    label = '—';
        		} else if (label === 'zu') {
        		    label = '↓';
        		}
        		html.push('<td id="' + row_id + '_label">' + label);
        		html.push('.</td>');
        		html.push('<td class="main_reading">');
        		html.push(text);           
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
        	    } else {
        		row_id = 'variant_unit_' + id + '_versionrow_' + i;
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
        	    if (ver_unit.readings[i].hasOwnProperty('version_reading') && ver_unit.readings[i].version_reading.hasOwnProperty('versional_text')) {
        		text = ver_unit.readings[i].version_reading.versional_text;
        	    } else {
        		text = 'No text supplied';
        	    }
        	    classes = ['version_parent'];
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
        		html.push('<tr id="' + row_id + '" class="' + classes.join(' ') + '"><td>' + labels.join('/') + '.</td><td>' + text + '</td></tr>');
        	    } else if (ver_unit.readings[i].parent_readings.length === 0) {
        		html.push('<tr id="' + row_id + '" class="' + classes.join(' ') + '"><td>?</td><td>' + text + '</td></tr>');
        	    }
        	}
            }
            html.push('</table>');
            html.push('</div>');
            html.push('</td>');
	    return [html, row_list, events];  
	},
	
	
	
//Menu stuff
	
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
	   /* status_summary_button = document.createElement('input');
	    status_summary_button.setAttribute('type', 'button');
	    status_summary_button.setAttribute('class', 'right_foot');
	    status_summary_button.setAttribute('value', 'Status summary');
	    status_summary_button.setAttribute('id', 'status_summary_button');
	    document.getElementById('footer').appendChild(status_summary_button);*/
	    VER.add_footer_handlers(project, user);
	},
	
/*	display_status_summary: function (data) {
	    var summary_div, output_div, levels, i, percent, select_data;
	    levels = ['regularised', 'set', 'ordered', 'approved'];
	    MAG._REQUEST.request('http://' + SITE_DOMAIN + '/collation/rule_menu.html', {
                'mime' : 'text',
                'success' : function (html) {
                    document.getElementById('container').innerHTML = html;
                    if (data.scope === 'book') {
        		document.getElementById('data_range').innerHTML = 'whole book';
        	    } else {
        		document.getElementById('data_range').innerHTML = 'chapter ' + data.scope;
        	    }
                    MAG.FORMS.populate_select(select_data, document.getElementById('summary_selection'), undefined, undefined, data.scope);
        	    MAG.EVENT.addEventListener(document.getElementById('summary_selection'), 'change', function () {
        		CL.get_project_summary(document.getElementById('summary_selection').value);
        	    });
                }
	    });
	},*/
	
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
	
	show_status_summary: function (project, user) {
	    /*project summary needs to have
	     * verses approved by editor waiting for version data (things in main_apparatus collection
	     * verses with saved versions (ie those started by this user)
	     * verses submitted by this user
	     * all of that overall and for each chapter as project status page
	     * then also have the more details verse by verse status as project page maybe
	    */
	},
	
	load_version_editor: function () {
	    var book, chapter, verse, criteria, ref;
	    book = document.getElementById('book').value;
            chapter = document.getElementById('chapter').value;
            verse = document.getElementById('verse').value;
            ref = book + 'K' + chapter + 'V' + verse; 
    	    CL._context = ref;
            if (book !== 'none' && !CL.is_blank(chapter) && !CL.is_blank(verse)) {
        	book = parseInt(book.replace('B', ''), 10);
    	    	chapter = parseInt(chapter, 10);
    	    	verse = parseInt(verse, 10);
        	criteria = {'project' : CL._project._id, 'context.book': book, 'context.chapter': chapter, 'context.verse': verse};
        	VER.do_load_version_editor(criteria);
            }
	},
	
	do_load_version_editor: function (criteria) {
	    var user_id;
	    SPN.show_loading_overlay();
	    //remove header message
	    document.getElementById('message_panel').innerHTML = '';
	    MAG.AUTH.get_user_info({'success': function (user) {
		user_id = user._id;
		MAG.REST.apply_to_list_of_resources('main_apparatus', {'criteria': criteria, 'success': function (apparatus) {
		    if (apparatus.results.length > 1) {
			VER.load_no_verse_page('Something has gone wrong. There are two instances of ' 
				+ CL._context 
				+ ' in the main apparatus collection.<br/>'
				+ 'Please contact your managing editor so this can be investigated.', {'container': CL._container});		    
		    } else if (apparatus.results.length === 0) {
			VER.load_no_verse_page(CL._context + ' has not yet been approved by the managing editor.', {'container': CL._container});
		    } else {
			CL._data = apparatus.results[0].structure;
			//we have exactly 1 instance of this verse in the main_apparatus table
			//so add language version to the criteria and look in the versional_data table
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
				    VER._version_data = {'_model': 'version_data', 
					    '_id': CL._context + '_' + VER._version_language + '_' + user_id + '_' + CL._project._id,
					    'context': CL.get_context_dict(), 
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
				VER.show_version_editor({'context': CL._context, 'container': CL._container});
			    } 
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