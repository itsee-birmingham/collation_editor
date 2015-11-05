/*global window, document, alert, MAG, CL, SV, RG, REDIPS, SimpleContextMenu */
/*jslint nomen: true*/

var OR = (function () {
    "use strict";
    return {
        hello: function () {
            console.log('order-readings');
        },

        _timeout: null,
        _undo_stack: [],
        _undo_stack_length: 6,
        
        /**create and show the reorder readings display
         * 
         * required:
         * data - JSON data structure of variation units
         * context - the verse in the format: B04K6V23
         * 
         * optional:
         * container - the HTML element to put the html result in 
         *              (defaults to body if not supplied or can't find it)
         * options - a dict containing other options
         * 		 possibilities are:
         *              	highlighted_wit - the witness to highlight in display*/
        show_reorder_readings: function (options) {
            var html, i, highest_unit, header, triangles, row, label, key, overlaps, app_ids, footer_html,
                num, temp, event_rows, scroll_offset, overlap_options, new_overlap_options, container,
                undo_button;
            console.log(CL._data);
            OR.add_labels(false);
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
            //attach right click menus
            SimpleContextMenu.setup({'preventDefault' : true, 'preventForms' : false});
            SimpleContextMenu.attach('main_reading', function () {return OR.make_menu('main_reading')});
            SimpleContextMenu.attach('overlap_main_reading', function () {return OR.make_menu('overlap_main_reading')});
            SimpleContextMenu.attach('subreading', function () {return OR.make_menu('subreading')});
            SimpleContextMenu.attach('overlap_unit', function () {return OR.make_menu('overlap_unit')});
            SimpleContextMenu.attach('reading_label', function () {return OR.make_menu('reading_label')});
            temp = CL.get_unit_layout(CL._data.apparatus, 1, 'reorder', options);
            header = CL.get_collation_header(CL._data, temp[1], false);
            html = header[0];
            highest_unit = header[1];
            html.push.apply(html, temp[0]);
            overlap_options = {'column_lengths': temp[1]};
            if (options.hasOwnProperty('highlighted_wit')) {
        	overlap_options.highlighted_wit = options.highlighted_wit;
            }
            if (options.hasOwnProperty('highlighted_unit')) {
        	overlap_options.highlighted_unit = options.highlighted_unit;
            }
            app_ids = CL.get_ordered_app_lines();
            for (i = 0; i < app_ids.length; i += 1) {
        	num = app_ids[i].replace('apparatus', '');
        	new_overlap_options = SV.calculate_unit_lengths(app_ids[i], overlap_options);
                overlaps = CL.get_overlap_layout(CL._data[app_ids[i]], num, 'reorder', header[1], new_overlap_options);
                html.push.apply(html, overlaps[0]);
                temp[2].push.apply(temp[2], overlaps[1]);
            }
            html.push('<ul id="context_menu" class="SimpleContextMenu"></ul>');
            document.getElementById('header').innerHTML = CL.get_header_html('Order Readings', CL._context);
            CL._services.show_login_status();
            document.getElementById('header').className = 'reorder_header';
            container.innerHTML = '<div id="scroller" class="fillPage"><table class="collation_overview">'
                + html.join('') + '</table></div><div id="single_witness_reading"></div>';
            CL.expandFillPageClients();
//            document.getElementById('scroller').style.height =
//                window.innerHeight - document.getElementById('footer').offsetHeight
//                - document.getElementById('header').offsetHeight - 40 + 'px';
            if (OR._undo_stack.length > 0) {
            	undo_button = '<input type="button" id="undo_button" value="undo"/>';
            } else {
            	undo_button = '';
            }
            //sort out footer stuff
            footer_html = [];
            footer_html.push('<input id="expand_collapse_button" type="button" value="collapse all"/>');
            footer_html.push('<input id="show_hide_subreadings_button" type=button value="show non-edition subreadings"/>');
            footer_html.push('<span id="stage_links"></span>');
            footer_html.push(undo_button);
            footer_html.push('<select id="highlighted" name="highlighted"></select>');
            footer_html.push('<input id="save" type=button value="Save"/>');
            if (CL._managing_editor === true) {
        	footer_html.push('<input id="approve" type="button" value="Approve"/>');
            }
            document.getElementById('footer').innerHTML = footer_html.join('');
            CL.add_stage_links();
            SPN.remove_loading_overlay();
            CL.add_triangle_functions('table');
            U.FORMS.populate_select(SV.get_hands_and_sigla(), document.getElementById('highlighted'), 'document', 'hand', options.highlighted_wit);
            $('#highlighted').on('change', function (event) {OR.highlight_witness(event.target.value);});
            if (document.getElementById('save')) {
        	$('#save').on('click', function (event) {CL.save_collation('ordered');});
            }
            CL.add_subreading_events('reorder', CL._get_rule_classes('subreading', true, 'value', ['identifier', 'subreading']));
            if (document.getElementById('approve')) {
        	$('#approve').on('click', function () {OR.approve_verse();});
            }
            for (i = 0; i < highest_unit; i += 1) {
                if (document.getElementById('drag_unit_' + i) !== null) {
                    OR.redips_init_reorder('drag_unit_' + i);
                }
            }
            for (key in CL._data) {
                if (CL._data.hasOwnProperty(key)) {
                    if (key.match(/apparatus\d/g) !== null) {
                        for (i = 0; i < CL._data[key].length; i += 1) {
                            if (document.getElementById('drag_unit_' + i + '_app_' + key.replace('apparatus', '')) !== null) {
                                OR.redips_init_reorder('drag_unit_' + i + '_app_' + key.replace('apparatus', ''));
                            }
                        }
                    }
                }
            }
            if (document.getElementById('undo_button')) {
        	$('#undo_button').on('click', function (event) {
            	    SPN.show_loading_overlay();
            	    OR.undo();
            	});
            }
	    CL.make_verse_links();
            event_rows = temp[2];
            for (i = 0; i < event_rows.length; i += 1) {
                row = document.getElementById(event_rows[i]);
                if (row !== null) {
                    CL._add_hover_events(row);
                }
            }
        },
        
        uniqueify_ids: function () {
            var id_list, key, i, j, unit, new_id, extra;
            id_list = [];
            for (key in CL._data) {
        	if (CL._data.hasOwnProperty(key) && key.indexOf('apparatus') != -1) {
        	    for (i = 0; i < CL._data[key].length; i += 1) {
        		//we are assuming units already have unique ids
        		//if we start changing them we need to keep the overlapped_units ids in synch
//        		extra = 0;
//        		while (id_list.indexOf(CL._data[key][i]._id) !== -1) {
//        		    console.log('adding new unit id')      		    
//        		    CL.add_unit_id(CL._data[key][i], key + extra);
//        		    console.log(JSON.parse(JSON.stringify(CL._data[key][i])));
//        		    extra += 1;
//        		}
//        		id_list.push(CL._data[key][i]._id);
        		for (j = 0; j < CL._data[key][i].readings.length; j += 1) {
        		    extra = 0;
        		    while (id_list.indexOf(CL._data[key][i].readings[j]._id) !== -1) {     
        			CL.add_reading_id(CL._data[key][i].readings[j], CL._data[key][i].start, CL._data[key][i].end + 'extra' + extra)
        			extra += 1;
        		    }
        		    id_list.push(CL._data[key][i].readings[j]._id);
        		}
        	    }
        	}
            }
        },
        
        approve_verse: function () {
            var standoff_problems, extra_results;
            SPN.show_loading_overlay();
            SV._lose_subreadings(); //for preparation and is needed
            standoff_problems = SV.check_standoff_reading_problems();
            if (!standoff_problems[0]) {
        	extra_results = CL.apply_pre_stage_checks('approve');
        	if (extra_results[0] === true) {
        	    CL._show_subreadings = false;
        	    //now do the stuff we need to do
        	    //make sure all ids are unique (we know there is a problem with overlapping a readings for example)
        	    OR.uniqueify_ids();     	    
        	    OR.order_witnesses_for_output();
                    CL.save_collation('approved', function () {OR.show_approved_version({'container': CL._container});});
                    //TODO: this does in magpy functions
                    //CL.export_to_apparatusEditor();
        	} else {
        	    if (CL._show_subreadings === true) {
        		SV._find_subreadings();
        	    } else {
        		SV._find_subreadings({'rule_classes': CL._get_rule_classes('subreading', true, 'value', ['identifier', 'subreading'])});
        	    }
        	    alert(extra_results[1]);
        	    SPN.remove_loading_overlay(); 
        	}
            } else if (standoff_problems[0]) {
        	if (CL._show_subreadings === true) {
        	    SV._find_subreadings();
        	} else {
        	    SV._find_subreadings({'rule_classes': CL._get_rule_classes('subreading', true, 'value', ['identifier', 'subreading'])});
        	}
        	alert('You cannot move to order readings because ' + standoff_problems[1]);
        	SPN.remove_loading_overlay();
            }          
        },
        
        order_witnesses_for_output: function () {
            var key, i, j;
            for (key in CL._data) {
                if (CL._data.hasOwnProperty(key)) {
                    if (key.indexOf('apparatus') != -1) {
                        for (i = 0; i < CL._data[key].length; i += 1) {
                            for (j = 0; j < CL._data[key][i].readings.length; j += 1) {
                        	CL._data[key][i].readings[j].witnesses = CL.sort_witnesses(CL._data[key][i].readings[j].witnesses);
                            }
                        }
                    }
                }
            }
        },

        get_unit_data: function (data, id, format, start, end, options) {
            var i, html, j, decisions, rows, cells, row_list, temp, events, max_length, row_id, type, overlapped,
                subrow_id, colspan, hand, OR_rules, key, reading_label, label_suffix, reading_suffix, text, label, overlap;
            html = [];
            row_list = [];
            overlap = false;
            if (id.indexOf('_app_') !== -1) {
        	overlap = true;
            }
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
            html.push('<td class="mark start_' + start + ' " colspan="' + (end - start + 1) + '"><div class="drag_div" id="drag_unit_' + id + '">');
            if (!overlap) {
        	html.push('<table class="variant_unit" id="variant_unit_' + id + '">');
            } else {
        	html.push('<table class="variant_unit overlap_unit" id="variant_unit_' + id + '">');
            }
            for (i = 0; i < data.length; i += 1) {
        	//what is the reading text?
                text = CL.extract_display_text(data[i], i, data.length, options.unit_id, options.app_id);
                if (text.indexOf('system_gen_') !== -1) {
        	    text = text.replace('system_gen_', '');
        	}                
                //what labels need to be used?
                reading_label = CL.get_reading_label(i, data[i], OR_rules);
                reading_suffix = CL.get_reading_suffix(data[i], OR_rules);
        	//what is the row id? (and add it to the list for adding events)
        	row_id = 'variant_unit_' + id + '_row_' + i;
                row_list.push(row_id);
                
                if (i === 0) {
                    html.push('<tr><td colspan="3" class="mark"><span id="toggle_variant_' + id + '" class="triangle">&#9650;</span></td></tr>');
                    if (data[i].witnesses.indexOf(hand) != -1) {
                        html.push('<tr id="' + row_id + '" class="top highlighted">');
                    } else {
                        html.push('<tr id="' + row_id + '" class="top">');
                    }
                    html.push('<td class="mark"></td>');
                } else {
                    if (data[i].witnesses.indexOf(hand) != -1) {
                        html.push('<tr id="' + row_id + '" class="highlighted">');
                    } else {
                        html.push('<tr id="' + row_id + '">');
                    }
                    html.push('<td class="rowhandler"><div class="drag row">+</div></td>');
                } 
                
                html.push('<td id="' + row_id + '_label" class="reading_label mark"><div class="spanlike">' + reading_label);
                html.push('</div></td>');
                if (!overlap) {
                    html.push('<td class="mark main_reading">');
                } else {
                    html.push('<td class="mark overlap_main_reading">');
                }
                html.push('<div class="spanlike">');
                html.push(text);
                if (reading_suffix !== '') {
                    html.push(' ' + reading_suffix);
                }
                html.push('</div>')
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
            html.push('</table>');
            html.push('</div></td>');
            return [html, row_list];
        },
        
        get_subunit_data: function (data, parent_index, parent_id, parent_label, subtype, hand, overlapped) {
            var type, i, row_type_id, row_list, html, subrow_id;
            row_list = [];
            html = [];           
            row_type_id = 'subrow';
            for (type in data) {
        	if (data.hasOwnProperty(type)) {
        	    for (i = 0; i < data[type].length; i += 1) {
        		subrow_id = 'subreading_unit_' + parent_id + '_row_' + parent_index + '_type_' + type + '_' + row_type_id + '_' + i;
        		row_list.push(subrow_id);
        		if (data[type][i].witnesses.indexOf(hand) != -1) {
        		    html.push('<tr class="' + subtype + ' highlighted" id="' + subrow_id + '">');
        		} else {
        		    html.push('<tr class="' + subtype + '" id="' + subrow_id + '">');
        		}
        		if (parent_label === 'zz') {
        		    html.push('<td></td>');
        		} else if (overlapped === true) {
        		    html.push('<td></td>');
        		} else {
        		    html.push('<td><div class="spanlike">' + parent_label + data[type][i].suffix + '.</td></td>')
        		}
        		html.push('<td><div class="spanlike">' + data[type][i].text_string + '</div></td>');
    		    	html.push('</tr>');
        	    }
        	}
            }
            return [html, row_list];
        },
        
        edit_label: function (rdg_details, menu_pos) {
            var left, top, label_form, html, new_label;
            left = menu_pos.left;
            top = menu_pos.top;
            label_form = document.createElement('div');
            label_form.setAttribute('id', 'label_form');
            label_form.setAttribute('class', 'label_form');
            html = [];
            html.push('<form id="label_change_form">');
            html.push('<label for="new_label">new label:<br/><input type="text" id="new_label"/></label><br/><br/>');
            html.push('<input id="close_button" type="button" value="Cancel"/>');
            html.push('<input id="save_button" type="button" value="save"/>');
            html.push('</form>');
            label_form.innerHTML = html.join('');
            document.getElementsByTagName('body')[0].appendChild(label_form);
            
            //the +25 here is to move it out of the way of the other labels so you can still see them
            left = parseInt(left) - document.getElementById('scroller').scrollLeft + 25;
            top = parseInt(top) - document.getElementById('scroller').scrollTop;
            document.getElementById('label_form').style.left = left + 'px';
            document.getElementById('label_form').style.top = top + 'px';
            document.getElementById('new_label').value = ''; //clear the text box just in case there is hangover
            $('#close_button').on('click', function (event) {
                document.getElementsByTagName('body')[0].removeChild(document.getElementById('label_form'));
            });
            $('#save_button').on('click', function (event) {
        	new_label = document.getElementById('new_label').value.replace(/\s+/g, '');
        	if (new_label != '') {
        	    OR.manual_change_label(rdg_details, new_label);
        	}
            });
        },
        
        manual_change_label: function (rdg_details, new_label) {
            var reading, scroll_offset;
            scroll_offset = [document.getElementById('scroller').scrollLeft, 
                             document.getElementById('scroller').scrollTop];
            OR.add_to_undo_stack(CL._data);
            reading = CL._data[rdg_details[1]][rdg_details[0]].readings[rdg_details[2]];
            reading.label = new_label;
            document.getElementsByTagName('body')[0].removeChild(document.getElementById('label_form'));
            OR.show_reorder_readings({'container': CL._container});
            document.getElementById('scroller').scrollLeft = scroll_offset[0];
            document.getElementById('scroller').scrollTop = scroll_offset[1];
        },
        
        /** highlight a witness, called from select box in page footer*/
        highlight_witness: function (witness) {
            var scroll_offset;
            scroll_offset = [document.getElementById('scroller').scrollLeft,
		             document.getElementById('scroller').scrollTop];
            CL._highlighted = witness;
            OR.show_reorder_readings({'container': CL._container, 'highlighted_wit' :witness});
            document.getElementById('scroller').scrollLeft = scroll_offset[0];
            document.getElementById('scroller').scrollTop = scroll_offset[1];
            if (witness !== 'none') {
        	CL.get_highlighted_text(witness);
            }
        },

        make_menu: function (menu_name) {
            var menu, div, key, subreadings, OR_rules;
            div = document.createElement('div');
            //menus for full units
            if (menu_name === 'subreading') {
        	document.getElementById('context_menu').innerHTML = '<li id="unmark_sub"><span>Make main reading</span></li>';
            } else if (menu_name === 'main_reading' || menu_name === 'overlap_main_reading') {
        	menu = [];
        	menu.push('<li id="split_witnesses"><span>Split Witnesses</span></li>');
        	subreadings = [];
        	OR_rules = CL._get_rule_classes('create_in_OR', true, 'name', ['subreading', 'value', 'identifier', 'keep_as_main_reading']);
        	for (key in OR_rules) {
        	    if (OR_rules.hasOwnProperty(key)) {
        		if (OR_rules[key][0]) {
        		    subreadings.push([key,  OR_rules[key][1],  OR_rules[key][2]]);
        		} else if (OR_rules[key][3]) {
        		    menu.push('<li id="mark_as_' + OR_rules[key][1] + '"><span>Mark/Unmark as ' + key + '</span></li>');
        		} else {
        		    menu.push('<li id="mark_as_' + OR_rules[key][1] + '"><span>Mark as ' + key + '</span></li>');
        		}
        	    }
        	}
        	if (subreadings.length === 1) {
		    if (typeof subreadings[0][2] !== 'undefined') {
			menu.push('<li id="mark_as_' + subreadings[0][1] + '"><span>Mark as ' + subreadings[0][0] + ' (' + subreadings[0][2] + ')</span></li>');
		    } else {
			menu.push('<li id="mark_as_' + subreadings[0][1] + '"><span>Mark as ' + subreadings[0][0] + '</span></li>');
		    }
		} else if (subreadings.length > 1) {
		    menu.push('<li id="mark_as_ORsubreading"><span>Mark as subreading</span></li>');
		}
        	document.getElementById('context_menu').innerHTML = menu.join('');
            } else if (menu_name === 'overlap_unit') {
        	document.getElementById('context_menu').innerHTML = '<li id="move_up"><span>Move unit up</span></li><li id="move_down"><span>Move unit down</span></li>';
            } else if (menu_name === 'reading_label') {
        	document.getElementById('context_menu').innerHTML = '<li id="edit_label"><span>Edit label</span></li>';
            }
            OR._add_CM_Handlers();
	    return 'context_menu';
        },
        
        make_main_reading: function (id_string) {
            var scroll_offset, unit_number, app_id, unit, subtype, parent_pos, subreading_pos, parent_reading, 
            subreading, options;
            scroll_offset = [document.getElementById('scroller').scrollLeft, 
                             document.getElementById('scroller').scrollTop];
            OR.add_to_undo_stack(CL._data);
            
            if (id_string.indexOf('_app_') === -1) {
                app_id = 'apparatus';
                unit_number = parseInt(id_string.substring(id_string.indexOf('unit_') + 5, id_string.indexOf('_row_'))); 
            } else {
        	unit_number = parseInt(id_string.substring(id_string.indexOf('unit_') + 5, id_string.indexOf('_app_')));
        	app_id = 'apparatus' + id_string.substring(id_string.indexOf('_app_') + 5, id_string.indexOf('_row_'));
            }     
            unit = CL._data[app_id][unit_number];
            subtype = id_string.substring(id_string.indexOf('_type_') + 6, id_string.indexOf('_subrow_'));
            parent_pos = parseInt(id_string.substring(id_string.indexOf('_row_') + 5, id_string.indexOf('_type_')));
            subreading_pos = parseInt(id_string.substring(id_string.indexOf('_subrow_') + 8));
            parent_reading = unit.readings[parent_pos];
            subreading = parent_reading.subreadings[subtype][subreading_pos];
            options = {'delete_offset': true};
            CL.make_main_reading(unit, parent_reading, subtype, subreading_pos, options);
            SV.prepare_for_operation();
            SV.unsplit_unit_witnesses(unit_number, app_id);
            SV.unprepare_for_operation();
            OR.relabel_readings(unit.readings, true);
            OR.show_reorder_readings({'container': CL._container});
            document.getElementById('scroller').scrollLeft = scroll_offset[0];
            document.getElementById('scroller').scrollTop = scroll_offset[1];
        },
        
        move_overlap_up: function (unit) {
            var details, id, app_num, is_space, i, key, scroll_offset,
            current_loc, new_loc;
            scroll_offset = [document.getElementById('scroller').scrollLeft, 
                             document.getElementById('scroller').scrollTop];
            OR.add_to_undo_stack(CL._data);
            details = CL.get_unit_app_reading(unit.id);
            id = CL._data[details[1]][details[0]]._id;
            app_num = parseInt(details[1].replace('apparatus', ''));
            current_loc = app_num;
            new_loc = app_num - 1;
            //console.log('I would like to move a unit from ' + current_loc + ' to ' + new_loc);
            is_space = OR.can_unit_move_to(id, current_loc, new_loc);
            if (!is_space) {
        	//then renumber all app lines from the one want to move to onwards to create a gap above the one we are looking for a space in
        	//NB this will involve renumbering the line our current unit is in
        	//console.log('renumber from ' + (app_num-3) + ' starting with number ' + app_num)
        	OR.thru_number_apps(app_num, app_num-3);
        	CL._data['apparatus' + new_loc] = [];
        	current_loc = app_num + 1;
            }
            //now move the unit to where we want it (we have already created the space if it was required)
            for (i = 0; i < CL._data['apparatus' + current_loc].length; i += 1) {
        	if (CL._data['apparatus' + current_loc][i]._id === id) {
        	    CL._data['apparatus' + new_loc].push(JSON.parse(JSON.stringify(CL._data['apparatus' + current_loc][i])));
        	    CL._data['apparatus' + new_loc].sort(CL.compare_start_indexes);
        	    CL._data['apparatus' + current_loc][i] = null;
        	}
            }
            CL.remove_null_items(CL._data['apparatus' + current_loc]);
            for (key in CL._data) {
        	if (key.indexOf('apparatus') !== -1) {
        	    if (CL._data[key].length === 0) {
        		delete CL._data[key];
        	    }
        	}
            }
            OR.thru_number_apps(2); //just check we are still sequential
            OR.show_reorder_readings({'container': CL._container});
            document.getElementById('scroller').scrollLeft = scroll_offset[0];
            document.getElementById('scroller').scrollTop = scroll_offset[1];
        },
        
        move_overlap_down: function (unit) {
            var details, id, scroll_offset, app_num, current_loc, new_loc,
            is_space, i, key;
            scroll_offset = [document.getElementById('scroller').scrollLeft, 
                             document.getElementById('scroller').scrollTop];
            OR.add_to_undo_stack(CL._data);
            details = CL.get_unit_app_reading(unit.id);
            id = CL._data[details[1]][details[0]]._id;
            app_num = parseInt(details[1].replace('apparatus', ''));
            current_loc = app_num;
            new_loc = app_num + 1;
            //console.log('I would like to move a unit from ' + current_loc + ' to ' + new_loc);
            //if there is no line there add one now
            if (!CL._data.hasOwnProperty('apparatus' + new_loc)) {
        	//console.log('I need to add a new line which is ' + new_loc)
        	CL._data['apparatus' + new_loc] = [];
            }
            is_space = OR.can_unit_move_to(id, current_loc, new_loc);
            if (!is_space) {
        	//console.log('renumber from ' + (app_num) + ' starting with number ' + (app_num + 3))
        	OR.thru_number_apps(app_num + 3, app_num);
        	new_loc = new_loc + 1;
        	CL._data['apparatus' + new_loc] = [];
            }
            //now move the unit to where we want it (we have already created the space if it was required)
            for (i = 0; i < CL._data['apparatus' + current_loc].length; i += 1) {
        	if (CL._data['apparatus' + current_loc][i]._id === id) {
        	    CL._data['apparatus' + new_loc].push(JSON.parse(JSON.stringify(CL._data['apparatus' + current_loc][i])));
        	    CL._data['apparatus' + new_loc].sort(CL.compare_start_indexes);
        	    CL._data['apparatus' + current_loc][i] = null;
        	}
            }
            CL.remove_null_items(CL._data['apparatus' + current_loc]);
            for (key in CL._data) {
        	if (key.indexOf('apparatus') !== -1) {
        	    if (CL._data[key].length === 0) {
        		delete CL._data[key];
        	    }
        	}
            }
            OR.thru_number_apps(2); //just check we are still sequential
            OR.show_reorder_readings({'container': CL._container});
            document.getElementById('scroller').scrollLeft = scroll_offset[0];
            document.getElementById('scroller').scrollTop = scroll_offset[1];                                  
        },

        _add_CM_Handlers: function () {
            var OR_rules, key, rule, rule_name, subtype, parent_pos, subreading_pos,
            parent_reading, subreading; 
            if (document.getElementById('unmark_sub')) {
        	$('#unmark_sub').off('click.ums_c');
        	$('#unmark_sub').off('mouseover.ums_mo');
        	$('#unmark_sub').on('click.ums_c', function(event) {
        	    var element, row_elem;
                    element = SimpleContextMenu._target_element;
                    row_elem = CL._get_specified_ancestor(element, 'TR')
                    //row_elem = element.parentNode;
                    OR.make_main_reading(row_elem.id);
          	});
        	$('#unmark_sub').on('mouseover.ums_mo', function(event) {CL.hide_tooltip();});
            }
            if (document.getElementById('split_witnesses')) {
        	$('#split_witnesses').off('click.sw_c');
        	$('#split_witnesses').off('mouseover.sw_mo');
        	$('#split_witnesses').on('click.sw_c', function(event) {
                    var element, div, reading_details;
                    element = SimpleContextMenu._target_element;
                    div = CL._get_specified_ancestor(element, 'TR');
                    reading_details = CL.get_unit_app_reading(div.id);
                    SV.split_reading_witnesses(reading_details, 'order_readings', {'top': SimpleContextMenu._menuElement.style.top, 'left': SimpleContextMenu._menuElement.style.left});
        	});
        	$('#split_witnesses').on('mouseover.sw_mo', function(event) {CL.hide_tooltip();});
            }
            if (document.getElementById('move_up')) {
        	$('#move_up').off('click.mu_c');
        	$('#move_up').off('mouseover.mu_mo');
        	$('#move_up').on('click.mu_c', function(event) {
	    	    var element, div;
	    	    element = SimpleContextMenu._target_element;
	    	    div = CL._get_specified_ancestor(element, 'DIV', function (e) { if ($(e).hasClass('spanlike')) {return false;} return true;});
	    	    OR.move_overlap_up(div);
          	});
        	$('#move_up').on('mouseover.mu_mo', function(event) {CL.hide_tooltip();});      	
            }
            if (document.getElementById('move_down')) {
        	$('#move_down').off('click.md_c');
        	$('#move_down').off('mouseover.md_mo');
        	$('#move_down').on('click.md_c', function(event) {
        	    var element, div;
        	    element = SimpleContextMenu._target_element;
        	    div = CL._get_specified_ancestor(element, 'DIV', function (e) { if ($(e).hasClass('spanlike')) {return false;} return true;});
        	    OR.move_overlap_down(div);
          	});
        	$('#move_down').on('mouseover.md_mo', function(event) {CL.hide_tooltip();});
            }
            if (document.getElementById('edit_label')) {
        	$('#edit_label').off('click.el_c');
        	$('#edit_label').off('mouseover.el_mo');
        	$('#edit_label').on('click.el_c', function(event) {
        	    var element, label_cell, rdg_details;
        	    element = SimpleContextMenu._target_element;
        	    label_cell = CL._get_specified_ancestor(element, 'TD');
        	    rdg_details = CL.get_unit_app_reading(label_cell.id);
        	    OR.edit_label(rdg_details, {'top': SimpleContextMenu._menuElement.style.top, 'left': SimpleContextMenu._menuElement.style.left});
          	});
        	$('#edit_label').on('mouseover.el_mo', function(event) {CL.hide_tooltip();});
            }
            //special added for OR
            OR_rules = CL._get_rule_classes('create_in_OR', true, 'name', ['subreading', 'value', 'identifier', 'keep_as_main_reading']);
            for (key in OR_rules) {
        	if (OR_rules.hasOwnProperty(key)) {
        	    if (!OR_rules[key][0]) {
        		if (document.getElementById('mark_as_' + OR_rules[key][1])) {
        		    OR.add_event(OR_rules, key);
        		}
        	    }
        	}
            }
            if (document.getElementById('mark_as_ORsubreading')) {
        	//make menu for mark_as_ORsubreading
        	key = 'ORsubreading';
        	$('#mark_as_' + key).off('click.' + key + '_c');
        	$('#mark_as_' + key).off('mouseover.' + key + '_mo');
        	$('#mark_as_' + key).on('click.' + key + '_c', function(event) {
        	    var element, div, unit, unit_pos, rdg_details, reading_pos, reading, reading_details;
        	    element = SimpleContextMenu._target_element;
        	    div = CL._get_specified_ancestor(element, 'TR');
        	    rdg_details = CL.get_unit_app_reading(div.id);
        	    unit_pos = rdg_details[0];
        	    app_id = rdg_details[1];
        	    reading_pos = rdg_details[2];
                    unit = CL._data[app_id][unit_pos];
                    reading = unit.readings[reading_pos];
                    reading_details = {'app_id': app_id, 'unit_id': unit._id, 'unit_pos': unit_pos, 'reading_pos': reading_pos, 'reading_id': reading._id};
        	    CL.mark_standoff_reading(key, 'Subreading', reading_details, 'order_readings', {'top': SimpleContextMenu._menuElement.style.top, 'left': SimpleContextMenu._menuElement.style.left});      	    
        	});
        	$('#mark_as_' + key).on('mouseover.' + key + '_mo', function(event) {CL.hide_tooltip();});
            } else {
                for (key in OR_rules) {
                    if (OR_rules.hasOwnProperty(key)) {
                	if (OR_rules[key][0]) { 
                	    if (document.getElementById('mark_as_' + OR_rules[key][1])) {
                		rule = JSON.parse(JSON.stringify(OR_rules[key]));
                		rule_name = key;
                		//mark the reading as subreading
                		$('#mark_as_' + OR_rules[key][1]).off('click.' + key + '_c');
                		$('#mark_as_' + OR_rules[key][1]).off('mouseover.' + key + '_mo');
                		$('#mark_as_' + OR_rules[key][1]).on('click.' + key + '_c', function(event) {
                        	    var element, div, unit, unit_pos, rdg_details, reading_pos, reading, reading_details, app_id;
                        	    element = SimpleContextMenu._target_element;
                        	    div = CL._get_specified_ancestor(element, 'TR');
                        	    rdg_details = CL.get_unit_app_reading(div.id);
                        	    unit_pos = rdg_details[0];
                        	    app_id = rdg_details[1];
                        	    reading_pos = rdg_details[2];
                                    unit = CL._data[app_id][unit_pos];
                                    reading = unit.readings[reading_pos];
                                    reading_details = {'app_id': app_id, 'unit_id': unit._id, 'unit_pos': unit_pos, 'reading_pos': reading_pos, 'reading_id': reading._id};
                        	    CL.mark_standoff_reading(rule[1], rule_name, reading_details, 'order_readings', {'top': SimpleContextMenu._menuElement.style.top, 'left': SimpleContextMenu._menuElement.style.left});
                        	});
                		$('#mark_as_' + OR_rules[key][1]).on('mouseover.' + key + '_mo', function(event) {CL.hide_tooltip();});
                	    }
                	} 
                    }
                }
            }
        },
        
        /**adds the correct handler depending on subreading and keep_as_main_reading settings in the project rule configurations */
        add_event: function (OR_rules, key) {
            //if this reading is not marked to be kept as a main reading then use stand_off marking
            if (!OR_rules[key][3]) {
        	$('#mark_as_' + OR_rules[key][1]).off('click.' + key + '_c');
        	$('#mark_as_' + OR_rules[key][1]).off('mouseover.' + key + '_mo');
        	$('#mark_as_' + OR_rules[key][1]).on('click.' + key + '_c', function(event) {
        	    var element, div, rdg_details, unit, unit_pos, reading_pos, reading, reading_details, app_id;
        	    element = SimpleContextMenu._target_element;
        	    div = CL._get_specified_ancestor(element, 'TR');
        	    rdg_details = CL.get_unit_app_reading(div.id);
        	    unit_pos = rdg_details[0];
        	    app_id = rdg_details[1];
        	    reading_pos = rdg_details[2];
                    unit = CL._data[app_id][unit_pos]
                    reading = unit.readings[reading_pos];
                    reading_details = {'app_id': app_id, 'unit_id': unit._id, 'unit_pos': unit_pos, 'reading_pos': reading_pos, 'reading_id': reading._id};     	    
                    CL.mark_standoff_reading(OR_rules[key][1], key, reading_details, 'order_readings', {'top': SimpleContextMenu._menuElement.style.top, 'left': SimpleContextMenu._menuElement.style.left});       	    
        	});
        	$('#mark_as_' + OR_rules[key][1]).on('mouseover.' + key + '_mo', function(event) {CL.hide_tooltip();});
            } else {
        	//else just add the marker and allow its removal
        	$('#mark_as_' + OR_rules[key][1]).off('click.' + key + '_c');
        	$('#mark_as_' + OR_rules[key][1]).off('mouseover.' + key + '_mo');
        	$('#mark_as_' + OR_rules[key][1]).on('click.' + key + '_c', function(event) {
        	    var element, div, rdg_details, reading_pos, reading, app_id, unit_pos;
        	    element = SimpleContextMenu._target_element;
        	    div = CL._get_specified_ancestor(element, 'TR');
        	    rdg_details = CL.get_unit_app_reading(div.id);
        	    unit_pos = rdg_details[0];
        	    app_id = rdg_details[1];
        	    reading_pos = rdg_details[2];
                    reading = CL._data[app_id][unit_pos].readings[reading_pos];
                    OR.mark_reading(OR_rules[key][1], reading);
        	});
        	$('#mark_as_' + OR_rules[key][1]).on('mouseover.' + key + '_mo', function(event) {CL.hide_tooltip();});
            }
        },
        
        mark_reading: function (value, reading) {
            var scroll_offset;
            scroll_offset = [document.getElementById('scroller').scrollLeft, 
                             document.getElementById('scroller').scrollTop];
            CL.mark_reading(value, reading);
            OR.show_reorder_readings({'container': CL._container});
            document.getElementById('scroller').scrollLeft = scroll_offset[0];
            document.getElementById('scroller').scrollTop = scroll_offset[1];
        },
        
        add_mark_reading_event: function (value) {
            $('#mark_as_' + value).on('click.mr_c', function(event) {
                var element, div, row_elem, row;
                element = SimpleContextMenu._target_element;
                div = CL._get_specified_ancestor(element, 'DIV', function (e) { if ($(e).hasClass('spanlike')) {return false;} return true;});
                unit_number = div.id.replace('drag_unit_', '');
                row_elem = element.parentNode;
                if (row_elem.id.indexOf('subrow') === -1) {
                    row = row_elem.id.substring(row_elem.id.indexOf('_row_') + 5);
                } else {
                    row = row_elem.id.substring(row_elem.id.indexOf('_row_') + 5, row_elem.id.indexOf('_type_'));
                }
                OR.mark_reading(value, unit_number, row, SimpleContextMenu._menuElement.style.top, SimpleContextMenu._menuElement.style.left);
            });
        },
        
        redips_init_reorder: function (id) {
            var rd = REDIPS.drag;
            rd.init(id);
            rd.event.rowDropped = function () {
                OR.reorder_rows(rd);
            };
        },

        reorder_rows: function (rd) {
            var table, rows, i, readings, order, new_order, j, reading, reading_id, unit, scroll_offset, temp, app;
            OR.add_to_undo_stack(CL._data);
            table = document.getElementById(rd.obj.id);
            temp = table.getElementsByTagName('TR');
            rows = [];
            if (rd.obj.id.indexOf('_app_') === -1) {
                app = 'apparatus';
                unit = parseInt(rd.obj.id.replace('variant_unit_', ''), 10);
            } else {
                app = 'apparatus' + rd.obj.id.substring(rd.obj.id.indexOf('_app_') + 5);
                unit = parseInt(rd.obj.id.substring(rd.obj.id.indexOf('unit_') + 5, rd.obj.id.indexOf('_app_')), 10);
            }
            for (i = 0; i < temp.length; i += 1) {
                if (temp[i].id.indexOf('subreading') === -1) {
                    rows.push(temp[i]);
                }
            }
            order = [];
            for (i = 0; i < rows.length; i += 1) {
                if (rows[i].id) {
                    reading_id = rows[i].id;
                    order.push(parseInt(reading_id.substring(reading_id.indexOf('row_') + 4), 10));
                }
            }
            readings = CL._data[app][unit].readings;
            delete CL._data[app][unit].readings;
            readings = CL.sort_array_by_indexes(readings, order);
            OR.relabel_readings(readings, true);
            CL._data[app][unit].readings = readings;
            scroll_offset = document.getElementById('scroller').scrollLeft;
            OR.show_reorder_readings({'container': CL._container});
            document.getElementById('scroller').scrollLeft = scroll_offset;
        },

        relabel_readings: function (readings, overwrite) {
            var i, j, label;
            for (i = 0; i < readings.length; i += 1) {
        	if (readings[i].hasOwnProperty('type') && readings[i].type === 'lac') {
        	    label = 'zz';
        	} else if (readings[i].hasOwnProperty('overlap_status')) {
        	    for (j = 0; j < CL._overlapped_options.length; j += 1) {
        		if (CL._overlapped_options[j].reading_flag === readings[i].overlap_status) {
        		    label = CL._overlapped_options[j].reading_label;
        		}
        	    }
        	} else {
        	    label = CL.get_alpha_id(i);
        	}
        	if (overwrite || !readings[i].hasOwnProperty('label')) {
        	    readings[i].label = label;
        	}
            }
        },
        
        add_labels: function (overwrite) {
            var i, key;
            for (key in CL._data) {
                if (CL._data.hasOwnProperty(key)) {
                    //TODO: replace with proper string match 
                    if (key.match(/apparatus\d?/) !== null) {
                        for (i = 0; i < CL._data[key].length; i += 1) {
                            OR.relabel_readings(CL._data[key][i].readings, overwrite);
                        }
                    }
                }
            }
        },

        open_subreading_menu: function (unit, row) {
            var html, data, subreading_menu, i, parents, scroll_offset;
            html = [];
            subreading_menu = document.createElement('div');
            subreading_menu.setAttribute('id', 'subreading_menu');
            subreading_menu.setAttribute('class', 'subreading_form');
            subreading_menu.innerHTML = '<p>Sub-reading menu</p><form id="subreading_form">'
                + '<input type="hidden" class="integer" value="' + unit + '" name="unit_number" id="unit_number"/>'
                + '<input type="hidden" class="integer" value="' + row + '" name="row_number" id="row_number"/>'
                + '<label>Parent reading<select name="parent_reading" id="parent_reading"></select></label>'
                + '<br/><label>Type<select name="sub_type" id="sub_type"><option value="o">orthographic</option><option value="v">vowel interchange</option><option value="ov">orthographic and vowel interchange</option></select></label>'
                + '<input type="button" value="submit" id="subreading_submit"/><input type="button" value="cancel" id="subreading_cancel"/></form>';
            document.getElementsByTagName('body')[0].appendChild(subreading_menu);
            parents = [];
            for (i = 0; i < CL._data.apparatus[unit].readings.length; i += 1) {
                if (i !== parseInt(row, 10)) {
                    parents.push(CL._data.apparatus[unit].readings[i].label);
                }
            }
            U.FORMS.populate_select(parents, document.getElementById('parent_reading'));
            $('#subreading_cancel').on('click', function (event) {document.getElementsByTagName('body')[0].removeChild(document.getElementById('subreading_menu'));});
            $('#subreading_submit').on('click', function (event) {
                data = U.FORMS.serialize_form('subreading_form');
                document.getElementsByTagName('body')[0].removeChild(document.getElementById('subreading_menu'));
                OR.make_subreading(data.unit_number, data.row_number, data.parent_reading, data.sub_type);
                scroll_offset = document.getElementById('scroller').scrollLeft;
                OR.show_reorder_readings({'container': CL._container});
                document.getElementById('scroller').scrollLeft = scroll_offset;
            });
        },


        //this one is used in interface
        make_subreading: function (unit, reading_no, parent_letter, type) {
            var readings, parent, reading, i, subreadings, text_string, text_list, exists;
            readings = CL._data.apparatus[unit].readings;
            reading = readings[reading_no];
            parent = null;
            for (i = 0; i < readings.length; i += 1) {
                if (readings[i].label === parent_letter) {
                    parent = readings[i];
                }
            }
            if (parent === null) {
                return false;
            }
            if (parent.hasOwnProperty('subreadings')) {
                subreadings = parent.subreadings;
            } else {
                subreadings = {};
            }
            text_list = [];
            for (i = 0; i < reading.text.length; i += 1) {
                text_list.push(reading.text[i].t);
            }
            text_string = text_list.join(' ');
            if (subreadings.hasOwnProperty(type)) {
                exists = false;
                for (i = 0; i < subreadings[type].length; i += 1) {
                    if (subreadings[type][i] === text_string) {
                        exists = true;
                    }
                }
                if (exists) {
                    alert('Talk to Cat, She wasn\'t sure this situation could ever occur and hasn\'t written the code!');
                } else {
                    reading.label = parent.label;
                    reading.text_string = text_string;
                    subreadings[type].push(reading);
                    parent.subreadings = subreadings;
                    readings.splice(reading_no, 1);
                }
            } else {
                reading.label = parent.label;
                reading.text_string = text_string;
                subreadings[type] = [reading];
                parent.subreadings = subreadings;
                readings.splice(reading_no, 1);
            }
            OR.relabel_readings(readings, true);
        },
        
        make_standoff_reading: function (type, reading_details, parent_reading) {
            var scroll_offset, apparatus, unit;
            scroll_offset = [document.getElementById('scroller').scrollLeft, 
                             document.getElementById('scroller').scrollTop];
            OR.add_to_undo_stack(CL._data);
            apparatus = reading_details.app_id;
            unit = CL.find_unit_by_id(apparatus, reading_details.unit_id);
            CL.make_standoff_reading(type, reading_details, parent_reading);
            OR.relabel_readings(unit.readings, true);
    	    OR.show_reorder_readings({'container': CL._container});
    	    document.getElementById('scroller').scrollLeft = scroll_offset[0];
    	    document.getElementById('scroller').scrollTop = scroll_offset[1];
        },

        change_label: function (event) {
            var new_label, id, app, unit, reading, i, scroll_offset, key;
            new_label = event.target.innerHTML;
            id = event.target.parentNode.parentNode.id;
            if (id.indexOf('_app_') === -1) {
                app = 'apparatus';
                unit = parseInt(id.substring(id.indexOf('_unit_') + 6, id.indexOf('_row_')), 10);
            } else {
                app = 'apparatus' + id.substring(id.indexOf('_app_') + 5, id.indexOf('_row_'));
                unit = parseInt(id.substring(id.indexOf('_unit_') + 6, id.indexOf('_app_')), 10);
            }
            reading = parseInt(id.substring(id.indexOf('_row_') + 5), 10);
            CL._data[app][unit].readings[reading].label = new_label;
            if (CL._data[app][unit].readings[reading].hasOwnProperty('subreadings')) {
                for (key in CL._data[app][unit].readings[reading].subreadings) {
                    if (CL._data[app][unit].readings[reading].subreadings.hasOwnProperty(key)) {
                        for (i = 0; i < CL._data[app][unit].readings[reading].subreadings[key].length; i += 1) {
                            CL._data[app][unit].readings[reading].subreadings[key][i].label = new_label;
                        }
                    }
                }
            }
            scroll_offset = document.getElementById('scroller').scrollLeft;
            OR.show_reorder_readings({'container': CL._container});
            //TODO: add height scroller sticker
            document.getElementById('scroller').scrollLeft = scroll_offset;
        },

        show_approved_version: function (options) {
            var html, i, highest_unit, header, triangles, row, label, key, overlaps, app_ids, footer_html,
            	num, temp, event_rows, scroll_offset, overlap_options, new_overlap_options, container;
            if (typeof options === 'undefined') {
        	options = {};
            }
            //make sure we have a container to put things in
            if (options.hasOwnProperty('container')) {                
                container = options.container;
            } else {
                container = document.getElementsByTagName('body')[0];
            }
            //sort out options and get layout
            if (!options.hasOwnProperty('highlighted_wit') && CL._highlighted !== 'none') {
        	options.highlighted_wit = CL._highlighted;
            }
            temp = CL.get_unit_layout(CL._data.apparatus, 1, 'approved', options);
            header = CL.get_collation_header(CL._data, temp[1], false);
            html = header[0];
            highest_unit = header[1];
            html.push.apply(html, temp[0]);
            overlap_options = {'column_lengths': temp[1]};
            if (options.hasOwnProperty('highlighted_wit')) {
        	overlap_options.highlighted_wit = options.highlighted_wit;
            }
            if (options.hasOwnProperty('highlighted_unit')) {
        	overlap_options.highlighted_unit = options.highlighted_unit;
            }
            app_ids = CL.get_ordered_app_lines();
            for (i = 0; i < app_ids.length; i += 1) {
        	num = app_ids[i].replace('apparatus', '');
        	new_overlap_options = SV.calculate_unit_lengths(app_ids[i], overlap_options);
                overlaps = CL.get_overlap_layout(CL._data[app_ids[i]], num, 'reorder', header[1], new_overlap_options);
                html.push.apply(html, overlaps[0]);
                temp[2].push.apply(temp[2], overlaps[1]);
            }
            
            
            document.getElementById('header').innerHTML = CL.get_header_html('Approved', CL._context);
            CL._services.show_login_status();
            document.getElementById('header').className = 'approved_header';
            container.innerHTML = '<div id="scroller" class="fillPage"><table class="collation_overview">'
                + html.join('') + '</table></div><div id="single_witness_reading"></div>';
            CL.expandFillPageClients();
            //sort out footer stuff
            footer_html = [];
            footer_html.push('<input id="expand_collapse_button" type="button" value="collapse all" />');
            footer_html.push('<span id="stage_links"></span>');
            footer_html.push('<input id="get_apparatus" type="button" value="Get apparatus"/>')
            document.getElementById('footer').innerHTML = footer_html.join('');
            $('#get_apparatus').off('click.download_link');
            $('#get_apparatus').on('click.download_link', function () {
        	var url;
        	url = 'http://' + SITE_DOMAIN + '/collation/apparatus';
        	OR.post(url, {
                    format: 'xml',
                    data: JSON.stringify([{"context": CL._context, "structure": CL._data}])
                });
            });           
            CL.add_stage_links();
            SPN.remove_loading_overlay();
            CL.add_triangle_functions('table');          
	    CL.make_verse_links();
            event_rows = temp[2];
            for (i = 0; i < event_rows.length; i += 1) {
                row = document.getElementById(event_rows[i]);
                CL._add_hover_events(row);
            }           
        },
        
        post: function (action, nameValueObj){
            var form = document.createElement("form");
            var i, input, prop;
            form.method = "post";
            form.action = action;
            for (prop in nameValueObj) { // Loop through properties: name-value pairs
                input = document.createElement("input");
                input.name = prop;
                input.value = nameValueObj[prop];
                input.type = "hidden";
                form.appendChild(input);
            }
            document.body.appendChild(form); //<-- Could be needed by some browsers?
            form.submit();
            console.log('done')
        },
        

        /** prep stuff for loading into order readings */
        compare_overlaps: function (a, b) {
            //always put overlap readings at the bottom (of their parent reading)
            if (a.hasOwnProperty('overlap')) {
                return 1;
            }
            if (b.hasOwnProperty('overlap')) {
                return -1;
            }
        },

        move_overlapped_readings: function () {
            var data, apparatus, readings, i;
            //make sure all overlapped readings are at the bottom of the list so they don't interfere with lettering system.
            data = CL._data;
            apparatus = data.apparatus;
            for (i = 0; i < apparatus.length; i += 1) {
                readings = apparatus[i].readings;
                readings.sort(OR.compare_overlaps);
            }
        },
        
        remove_splits: function () {
            var i, j, apparatus, key;
            for (key in CL._data) {
                if (CL._data.hasOwnProperty(key)) {
                    //TODO: replace with proper string match 
                    if (key.match(/apparatus\d?/g) !== null) {
                        apparatus = CL._data[key];
                        for (i = 0; i < apparatus.length; i += 1) {
                            delete apparatus[i].split_readings;
                        }
                        CL._data[key] = apparatus;
                    }
                }
            }
        },
        
        //Need to work this out from the top line as we can't actually rely on the start and end values in the overlaps
        merge_shared_extent_overlaps: function () {
            var key, i, m, overlap_lines, overlap_indexes, shared_overlaps, new_key, lead_unit, to_delete;
            to_delete = [];
            overlap_lines = [];
            overlap_indexes = {};
            shared_overlaps = {};
            for (key in CL._data) {
        	if (CL._data.hasOwnProperty(key)) {
        	    if (key.match(/apparatus\d+/) !== null) {
        		m = key.match(/apparatus(\d+)/);
        		overlap_lines.push(parseInt(m[1]));
        	    }
        	}
            }
            overlap_lines.sort(); 
            //no point in even looking if we don't have more than one line of overlapped apparatus
            if (overlap_lines.length > 1) {  
        	//create a dictionary with each overlapped unit as key to a 2 entry list. 
        	//By the end the first index will be pos 0 and the final pos 1
        	for (i = 0; i < CL._data['apparatus'].length; i += 1) {
        	    if (CL._data['apparatus'][i].hasOwnProperty('overlap_units')) {
        		for (key in CL._data['apparatus'][i].overlap_units) {
        		    if (CL._data['apparatus'][i].overlap_units.hasOwnProperty(key)) {
        			if (!overlap_indexes.hasOwnProperty(key)) {
        			    overlap_indexes[key] = [i, i];
        			} else {
        			    overlap_indexes[key][1] = i;
        			}
        		    }
        		}
        	    }
        	}
            }
            //now switch the dictionary round so each set of index points are key to unit ids
            for (key in overlap_indexes) {
        	if (overlap_indexes.hasOwnProperty(key)) {
        	    new_key = overlap_indexes[key].join('-');
        	    if (shared_overlaps.hasOwnProperty(new_key)) {
            	    	shared_overlaps[new_key].push(key);
            	    } else {
            		shared_overlaps[new_key] = [key];
            	    }
        	}
            }
            //now see if any have more than one unit at each pair of indexes and therefore need combining
            for (key in shared_overlaps) {
        	if (shared_overlaps.hasOwnProperty(key)) {
        	    if (shared_overlaps[key].length > 1) {
        		lead_unit = OR.find_lead_unit(shared_overlaps[key], overlap_lines);
        		OR.horizontal_combine_overlaps(key, shared_overlaps[key], lead_unit);
        	    }
        	}
            }
            //now delete any apparatus keys which are empty
            for (key in CL._data) {
        	if (CL._data.hasOwnProperty(key)) {
        	    if (key.match(/apparatus\d+/) !== null) {
        		if (CL._data[key].length === 0) {
        		    to_delete.push(key);
        		}
        	    }
        	}
            }
            for (i = 0; i < to_delete.length; i += 1) {
        	delete CL._data[to_delete[i]];
            }
            //this needs to be called at the end once we have deleted any empty overlap lines otherwise it will fill up the empty ones again
            //it will need to rerun the deletion once it is done so maybe make that a separate function
            OR.reposition_overlaps();
            OR.thru_number_apps(2);
        },
        
        //through number all the overlapping apparatus lines from start_line with the 
        //first number of the renumbered readings labeled as start_index
        //it is safe to assume that when we call this with a start_row value that all 
        //app lines are thru numbered from 2 at the point we call it.
        thru_number_apps: function (start_index, start_row) {
            var key, overlap_lines, i, m, renumber, j, all;
            all = false;
            if (typeof start_row === 'undefined') {
        	all = true;
        	start_row = 0;
            }
            overlap_lines = [];
            for (key in CL._data) {
        	if (CL._data.hasOwnProperty(key)) {
        	    if (key.match(/apparatus\d+/) !== null) {
        		m = key.match(/apparatus(\d+)/);
        		overlap_lines.push(parseInt(m[1]));
        	    }
        	}
            }
            overlap_lines.sort();
            if (all === false && start_index < overlap_lines[start_row]) {
        	console.log('you are asking me to do something silly and I won\'t do it!');
            } else {
        	//see if we even need to renumber any app lines
        	renumber = false;
        	j = start_index;
        	for (i = start_row; i < overlap_lines.length; i += 1) {
        	    if (overlap_lines[i] !== j) {
        		renumber = true;
        	    }
        	    j += 1;
        	}
        	if (renumber === true) {
        	    //rename all the apparatus keys so we won't accidentally overwrite anything
        	    for (i = start_row; i < overlap_lines.length; i += 1) {
        		if (CL._data.hasOwnProperty('apparatus' + overlap_lines[i])) {
        		    CL._data['old_apparatus' + overlap_lines[i]] = CL._data['apparatus' + overlap_lines[i]];
        		    delete CL._data['apparatus' + overlap_lines[i]];
        		}
        	    }
        	    j = start_index;
        	    //now through number them as we want
        	    for (i = start_row; i < overlap_lines.length; i += 1) {
        		if (CL._data.hasOwnProperty('old_apparatus' + overlap_lines[i])) {
        		    CL._data['apparatus' + j] = CL._data['old_apparatus' + overlap_lines[i]];
        		    delete CL._data['old_apparatus' + overlap_lines[i]];
        		}
        		j += 1;
        	    }
        	}
            }  
        },
        
        //by this point we have added accurate start and end values for each unit so we can relly on them for testing overlaps
        reposition_overlaps: function () {
            var key, m, overlap_lines, i, j, moving_start, moving_end, move_to, apparatus_line;
            overlap_lines = [];
            for (key in CL._data) {
        	if (CL._data.hasOwnProperty(key)) {
        	    if (key.match(/apparatus\d+/) !== null) {
        		m = key.match(/apparatus(\d+)/);
        		overlap_lines.push(parseInt(m[1]));
        	    }
        	}
            }
            overlap_lines.sort();
            //which is best - the algorithm below or using start and end in the overlaps themselves?
            //work from the second line of overlaps because the ones in the top line are already as high as they can be
            for (i = 1; i < overlap_lines.length; i += 1) {
        	apparatus_line = CL._data['apparatus' + overlap_lines[i]];
        	for (j = 0; j < apparatus_line.length; j += 1) {
        	    moving_start = apparatus_line[j].start;
        	    moving_end = apparatus_line[j].end;
        	    move_to = OR.unit_can_move_to(apparatus_line[j]._id, overlap_lines, i);
        	    if (move_to !== -1) {
        		CL._data['apparatus' + move_to].push(JSON.parse(JSON.stringify(apparatus_line[j])));
        		CL._data['apparatus' + move_to].sort(CL.compare_start_indexes);
        		apparatus_line[j] = null;
        	    }
        	}
        	CL.remove_null_items(apparatus_line);
            }
            //now delete any apparatus lines we don't need any more
            for (key in CL._data) {
        	if (CL._data.hasOwnProperty(key)) {
        	    if (key.match(/apparatus\d+/) !== null) {
        		if (CL._data[key].length === 0) {
        		    delete CL._data[key];
        		}
        	    }
        	}   	
            }
        },
        
        get_potential_conflicts: function (id) {
            var i, ids, key;
            ids = [];
            for (i = 0; i < CL._data.apparatus.length; i += 1) {
        	if (CL._data.apparatus[i].hasOwnProperty('overlap_units') 
        		&& CL._data.apparatus[i].overlap_units.hasOwnProperty(id)) {
        	    for (key in CL._data.apparatus[i].overlap_units) {
        		if (CL._data.apparatus[i].overlap_units.hasOwnProperty(key) 
        			&& key !== id) {
        		    if (ids.indexOf(key) === -1) {
        			ids.push(key);
        		    }
        		}
        	    }
        	}
            }
            return ids;
        },
        
        //return the highest (nearest to the top, so lowest index number) app line that this unit
        //can be repositioned to without conflict with existing units
        unit_can_move_to: function (id, overlap_keys, current_app_row) {
            var conflict_units, i, j, conflict;
            conflict_units = OR.get_potential_conflicts(id);
            for (i = 0; i < current_app_row; i += 1) {
        	conflict = false;
        	if (conflict_units.length === 0) {
        	    //then there are no potential conflicts to move it as high as we can
        	    return overlap_keys[i];
        	}
        	for (j = 0; j < CL._data['apparatus' + overlap_keys[i]].length; j += 1) {
        	    if (conflict_units.indexOf(CL._data['apparatus' + overlap_keys[i]][j]._id) !== -1) {
        		conflict = true;
        	    }
        	}
        	if (conflict === false) {
        	    return overlap_keys[i];
        	}
            }
            return -1;
        },
        
        //
        can_unit_move_to: function (id, current_app_row, new_app_row) {
            var i, conflict_units, conflict;
            conflict_units = OR.get_potential_conflicts(id);
            conflict = false;
            if (conflict_units.length === 0) {
        	return true;
            }
            if (!CL._data.hasOwnProperty('apparatus' + new_app_row)) {
        	return false
            }
            for (i = 0; i < CL._data['apparatus' + new_app_row].length; i += 1) {
        	if (conflict_units.indexOf(CL._data['apparatus' + new_app_row][i]._id) !== -1) {
        	    conflict = true;
        	}
            }
            if (conflict === false) {
        	return true;
            }
            return false;
        },
        
        find_lead_unit: function (ids, overlap_lines) {
            var i, j, k, unit;
            for (i = 0; i < overlap_lines.length; i += 1) {
        	for (j = 0; j < CL._data['apparatus' + overlap_lines[i]].length;  j += 1) {
        	    unit = CL._data['apparatus' + overlap_lines[i]][j];
        	    if (ids.indexOf(unit._id) !== -1) {
        		//just return the id we find first (we are going through apparatus in order)
    		    	return unit._id;
        	    }	    
        	}
            }
            //we should have returned by now just in case best return something sensible
            return ids[0];
        },
        
        delete_unit: function (apparatus, unit_id) {
            var i;
            for (i = CL._data[apparatus].length-1; i >= 0; i -= 1) {
        	if (CL._data[apparatus][i]._id === unit_id) {
        	    CL._data[apparatus].splice(i, 1);
        	}
            }
        },
        
        /** next two functions allow undo operation. */       
        add_to_undo_stack: function (data) {
            if (OR._undo_stack.length === OR._undo_stack_length) {
        	OR._undo_stack.shift();
            }
            OR._undo_stack.push(JSON.stringify(data));
        },
        
        undo: function () {
            var i, event_list, scroll_offset;
            if (OR._undo_stack.length > 0) {
        	scroll_offset = [document.getElementById('scroller').scrollLeft, 
                                 document.getElementById('scroller').scrollTop];
        	event_list = CL._data.event_list;
        	CL._data = JSON.parse(OR._undo_stack.pop());
        	OR.show_reorder_readings({'container': CL._container});
        	document.getElementById('scroller').scrollLeft = scroll_offset[0];
                document.getElementById('scroller').scrollTop = scroll_offset[1];
            }
        },
        
        //here combine all overlapped units at the same index location find the one in the lowest apparatus number
        horizontal_combine_overlaps: function (location_info, unit_ids, lead_id) {
            var key, i, j, locations, witnesses, lead_unit, unit, temp, apparatus;
            locations = location_info.split('-');
            //here move all readings into the lead_id unit and delete the others
            lead_unit = CL.find_overlap_unit_by_id(lead_id);
            for (i = 0; i < unit_ids.length; i += 1) {
        	if (unit_ids[i] !== lead_id) {
        	    temp = CL.find_overlap_apparatus_and_unit_by_id(unit_ids[i]);
        	    unit = temp[0];
        	    apparatus = temp[1];
        	    lead_unit.readings.push(JSON.parse(JSON.stringify(unit.readings[1])));
        	    lead_unit.start = CL._data.apparatus[locations[0]].start;
        	    lead_unit.end = CL._data.apparatus[locations[1]].end;
        	    OR.delete_unit(apparatus, unit_ids[i]);
        	}
            }
            //now combine all the top line data into the lead id (this must be correct for display to work)
            for (i = parseInt(locations[0]); i <= parseInt(locations[1]); i += 1) {
        	witnesses = [];
        	if (CL._data.apparatus[i].hasOwnProperty('overlap_units')) {
        	    for (j = 0; j < unit_ids.length; j += 1) {
        		if (CL._data.apparatus[i].overlap_units.hasOwnProperty(unit_ids[j])) {
        		    witnesses.push.apply(witnesses, CL._data.apparatus[i].overlap_units[unit_ids[j]]);
        		    delete CL._data.apparatus[i].overlap_units[unit_ids[j]];
        		}
        	    }
        	}
        	CL._data.apparatus[i].overlap_units[lead_id] = witnesses;
            }
        },
        
        //this currently focuses only on gaps where they are the only thing in the reading
        //we may want to do something similar where they are combined too but it doesn't seem essential at this point
        make_was_gap_words_gaps: function () {
            var i, j;
            //only needed on top line because this is a feature of overlapping
            for (i = 0; i < CL._data.apparatus.length; i += 1) {
        	for (j = 0; j < CL._data.apparatus[i].readings.length; j += 1) {
        	    if (CL._data.apparatus[i].readings[j].text.length === 1 && CL._data.apparatus[i].readings[j].text[0].hasOwnProperty('was_gap')) {
        		//make it a real gap again
        		CL._data.apparatus[i].readings[j].type = 'lac';
        		CL._data.apparatus[i].readings[j].details = CL._data.apparatus[i].readings[j].text[0]['interface'].replace('&gt;', '').replace('&lt;', '');
        		CL._data.apparatus[i].readings[j].text = [];
        	    }
        	}
            }
        },
        


        
        //shouldn't be needed for overlapped units but just do it for safety
        //anything with an overlap_status flag should not be combined and should remain separate
        //we make a generic parent which goes in the position of the first found reading with all the others as a special kind of subreading
        //and we give the generic parent a unique id like all other readings
        merge_all_supplied_empty_readings: function (type_list, parent_blueprint, always_create_new_parent) {
            var key, i, j, k, unit, reading, first_hit_index, matched_readings, new_parent, witness, type, parent_id,
            reading, rdg_details;
            SV._lose_subreadings();
            SV._find_subreadings();
            matched_readings = {}
            for (key in CL._data) {
        	if (key.match(/apparatus\d*/g) !== null) {
        	    for (i = 0; i < CL._data[key].length; i += 1) {
        		unit = CL._data[key][i];
        		for (j = 0; j < CL._data[key][i].readings.length; j += 1) {
        		    reading = CL._data[key][i].readings[j];
        		    if (reading.text.length === 0 && !reading.hasOwnProperty('overlap_status')) {
        			if (type_list.indexOf(reading.type) != -1) {
        			    if (!matched_readings.hasOwnProperty(unit._id)) {
        				matched_readings[unit._id] = [];
        			    }
        			    rdg_details = {'app_id': key, 'unit_id': unit._id, 'unit_pos': i, 'reading_id': reading._id}
        			    if (reading.hasOwnProperty('subreadings')) {
        				rdg_details['subreadings'] = true;
        			    }
        			    matched_readings[unit._id].push(rdg_details);
        			}
        		    }
        		}
        	    }
        	}
            }
            //now data is collected
            SV._lose_subreadings();
            for (key in CL._data) {
        	if (key.match(/apparatus\d*/g) !== null) {
        	    for (i = 0; i < CL._data[key].length; i += 1) {
        		unit = CL._data[key][i];
        		if (matched_readings.hasOwnProperty(unit._id)) {
        		    if ((always_create_new_parent === true 
        			    && matched_readings[unit._id].length > 0) 
        			    || matched_readings[unit._id].length > 1) {

        			for (j = 0; j < matched_readings[unit._id].length; j += 1) {  
        			    new_parent = JSON.parse(JSON.stringify(parent_blueprint)); //copy our blueprint
        			    parent_id = CL.add_reading_id(new_parent, unit.start, unit.end);
        			    unit.readings.push(new_parent);
        			    reading = CL.find_reading_by_id(unit, matched_readings[unit._id][j].reading_id);
        			    if (reading) { //sometimes because we have lost subreadings standoff readings might no longer exist in this pass through. Somehow this still works!
                			if (matched_readings[unit._id][j].hasOwnProperty('subreadings')) {
                			    CL.make_standoff_reading('none', {'app_id': key, 'unit_id': unit._id, 'unit_pos': i, 'reading_id': matched_readings[unit._id][j].reading_id}, parent_id);
                			} else {
                			    CL.do_make_standoff_reading('none', key, unit, reading, new_parent);
                			}   
        			    }     			      		    	
        			} 
        		    }
        		}
        	    }
        	}
            }
            SV._lose_subreadings();
            SV._find_subreadings();
            SV._lose_subreadings();
        },
        
        merge_all_lacs: function() {
            OR.merge_all_supplied_empty_readings(['lac', 'lac_verse'], {'created': true, 'type':'lac', 'details': 'lac', 'text': [], 'witnesses': []}, true);
        },
        
        merge_all_oms: function() {
            OR.merge_all_supplied_empty_readings(['om', 'om_verse'], {'created': true, 'type':'om', 'text': [], 'witnesses': []}, true);
        },

    };
}());
