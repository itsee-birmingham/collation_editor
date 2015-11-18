/*global window, document, MAG, CL, COLLATE, OR, SV, REDIPS, SimpleContextMenu, alert, SITE_DOMAIN*/
/*jslint nomen: true*/

var RG = (function () {
    "use strict";
    return {
        hello: function () {
            console.log('regularise');
        },

        _rules: [],
        _for_deletion: [],
        _for_global_exceptions: [],
        _show_regularisations: false,
        _rule_words_summary: {},
               
        
        /** collation running **/
        prepare_collation: function (output) {
            var language, base_text, data, options, witness_list, key, collation_source, context; 
            SPN.show_loading_overlay();
            CL._data_settings.language = document.getElementById('language').value;
            CL._data_settings.base_text = document.getElementById('base_text').value;          
            context = CL.get_context_from_input_form();                  
            if (context && base_text !== 'none') {
        	CL._context = context;
        	if (document.getElementById('preselected_witnesses')) {
        	    CL._data_settings.witness_list = document.getElementById('preselected_witnesses').value.split(',');
        	} else {
        	    witness_list = [];
        	    data = U.FORMS.serialize_form('collation_form');
        	    if (!$.isEmptyObject(data)) {
        		witness_list = [];
        		for (key in data) {
        		    if (data.hasOwnProperty(key)) {
        			witness_list.push(key);
        		    }
        		}
        		if (witness_list.indexOf(CL._data_settings.base_text) === -1) {
        		    witness_list.push(CL._data_settings.base_text);
        		}
        	    }
        	    CL._data_settings.witness_list = witness_list;
        	}
        	RG.get_collation_data(CL._data_settings.collation_source, output, 0);
            }
        },     
		
        calculate_lac_wits: function (collation_data, result_callback) {
            var i, transcription_id, lac_transcriptions;
            lac_transcriptions = JSON.parse(JSON.stringify(CL._data_settings.witness_list));
            for (i = 0; i < collation_data.length; i += 1) {
        	transcription_id = collation_data[i].transcription_id;
        	if (lac_transcriptions.indexOf(transcription_id) !== -1) {
        	    lac_transcriptions.splice(lac_transcriptions.indexOf(transcription_id), 1);
        	}
            }
            result_callback(lac_transcriptions);
        },

        get_collation_data: function (collation_source, output, scroll_offset, callback) {
            CL._container = document.getElementById('container');
            CL._services.get_verse_data(CL._context, CL._data_settings.witness_list, false, function(verse_data) {
        	var collation_data;
        	collation_data = verse_data;
        	CL._services.get_verse_data(CL._context, CL._data_settings.witness_list, true, function(verse_data, lac_wits_function) {
        	    collation_data.push.apply(collation_data, verse_data);
        	    RG.calculate_lac_wits(collation_data, function(lac_witness_list) {
        		CL._services.get_siglum_map(lac_witness_list, function(lac_witnesses) {
        		    CL._collate_data = {'data':collation_data, 'lac_witnesses': lac_witnesses};
        		    if (typeof callback !== 'undefined') {
        			callback();
        		    } else {
        			RG.run_collation(CL._collate_data, output, scroll_offset);
        		    }
        		});
        	    });
        	});
            });
        },
   
        //currently only used by vmr services move to there?
        tei2json: function (tei, result_callback) {
            var url, options, xmldom, ts, i, lac_witnesses, lac_docID;
            url = 'http://' + SITE_DOMAIN + '/tei2json/';
            $.post(url, {'tei': tei}, function (json) {
        	result_callback(json);
            });
        },

        has_rule_applied: function (word) {
            var i, j;
            for (i = 0; i < word.reading.length; i += 1) {
        	if (RG._rule_words_summary.hasOwnProperty(word.reading[i])) {
        	    if (RG._rule_words_summary[word.reading[i]].hasOwnProperty('index') && RG._rule_words_summary[word.reading[i]].index.indexOf(word[word.reading[i]].index) !== -1) {
        		return true;
        	    }
        	}
            }           
            return false;
        },

        /** get the data for the unit of this type 
         * 	data - the readings for that unit
         * 	id - the identifier for the unit
         * 	start - the start position
         * 	end - the end position
         * 	options - possibilities are:
         * 		
         * */
        get_unit_data: function (data, id, start, end, options) {
            var i, html, j, k, l, decisions, rows, cells, row_list, temp, events, max_length, row_id, type,
                subrow_id, colspan, hand, class_string, div_class_string, witness, id_dict, key, words, reg_class,
                highlighted, cells_dict, rule_cells, keys_to_sort;
            if (typeof options === 'undefined') {
        	options = {};
            }
            if (options.hasOwnProperty('highlighted_wit')) {
                hand = options.highlighted_wit.split('|')[1];
            } else {
                hand = null;
            }
            html = [];
            row_list = [];
            events = {};
            decisions = [];
            max_length = ((end - start) / 2) + 1;
            rows = [];
            for (i = 0; i < data.length; i += 1) {
                cells = [];
                row_id = 'variant_unit_' + id + '_row_' + i;
                row_list.push(row_id);
                if (i === 0) {
                    cells.push('<tr><td class="mark" colspan="MX_LN"><span id="toggle_variant_' + id + '" class="triangle">&#9650;</span></td></tr>');
                }
                class_string = '';
                if (data[i].witnesses.indexOf(hand) != -1 && i === 0) {
                    class_string = ' class="top highlighted" ';
                } else if (data[i].witnesses.indexOf(hand) != -1) {
                    class_string = ' class="highlighted" ';
                } else if (i === 0) {
                    class_string = ' class="top" ';
                }
                cells.push('<tr id="' + row_id + '"' + class_string + '>');
                cells.push('<td class="mark"><div class="spanlike">' + CL.get_alpha_id(i) + '. </div></td>');
                if (data[i].text.length === 0) {
                    if (i === 0) {
                        cells.push('<td class="mark" colspan="MX_LN"><div class="spanlike">&nbsp;</div></td>');
                    } else {
                        if (data[i].type === 'om') {
                            cells.push('<td class="mark gap" colspan="MX_LN"><div class="spanlike">om.</div></td>');
                        } else {
                            cells.push('<td class="mark gap" colspan="MX_LN"><div class="spanlike">&lt;' + data[i].details + '&gt;</div></td>');
                        }
                    }
                } else {
                    if (data[i].text.length > max_length) {
                        max_length = data[i].text.length;
                    }
                    for (j = 0; j < data[i].text.length; j += 1) {
                	div_class_string = '';
                	if (i > 0) {
                	    if (RG.has_rule_applied(data[i].text[j])) {
                		div_class_string = ' class="drag clone reg_word regularised" ';
                	    } else {
                		div_class_string = ' class="drag clone reg_word" ';
                	    }
                        }
                	cells.push('<td>')
                	words = data[i].text;
                	if (words[j][words[j]['reading'][0]].hasOwnProperty('gap_before') && words[j].hasOwnProperty('combined_gap_before')) {
                	    cells.push('<div class="gap spanlike"> &lt;' + words[j][words[j]['reading'][0]].gap_details + '&gt; </div>')
                	}
                	cells.push('<div ' + div_class_string + 'id="variant_unit_' + id + '_r' + i + '_w' + j + '">' + CL.get_token(words[j]) + '</div>');
                	if (words[j][words[j]['reading'][0]].hasOwnProperty('gap_after') && (j < words.length-1 || words[j].hasOwnProperty('combined_gap_after'))) {
                	    cells.push('<div class="gap spanlike"> &lt;' + words[j][words[j]['reading'][0]].gap_details + '&gt; </div>');
    		    	}
                	if (RG._show_regularisations) {
                	    id_dict = {};
                	    cells.push('<table><tbody>');
                	    for (k = 0; k < data[i].witnesses.length; k += 1) {
                		witness = data[i].witnesses[k];
                		if (data[i].text[j].hasOwnProperty(witness) && data[i].text[j][witness].hasOwnProperty('decision_details')) {
                		    for (l = 0; l < data[i].text[j][witness].decision_details.length; l += 1) {
                			if (id_dict.hasOwnProperty(data[i].text[j][witness].decision_details[l]._id)) {
                			    id_dict[data[i].text[j][witness].decision_details[l]._id].witnesses.push(witness);
                			} else {
                			    id_dict[data[i].text[j][witness].decision_details[l]._id] = {
                				    'scope': data[i].text[j][witness].decision_details[l].scope, 
                				    't':data[i].text[j][witness].decision_details[l].t.replace('<', '&lt;').replace('>', '&gt;'), 
                				    'n':data[i].text[j][witness].decision_details[l].n.replace('<', '&lt;').replace('>', '&gt;'), 
                				    'witnesses': [witness]};
                			}
                		    }
                		}
                	    }
                	    keys_to_sort = [];
                	    cells_dict = {};
                	    for (key in id_dict) {
                		if (id_dict.hasOwnProperty(key)) {
                		    rule_cells = [];
                		    if (id_dict[key].scope === 'always') {
                			reg_class = 'regularised_global ';
                		    } else {
                			reg_class = 'regularised ';
                		    }
                		    if (RG.has_deletion_scheduled(key)) {
                			reg_class += 'deleted ';
                		    }
                		    highlighted = '';
                		    if (id_dict[key].witnesses.length > 1) {
                			id_dict[key].witnesses = CL.sort_witnesses(id_dict[key].witnesses);
                		    }
                		    if (keys_to_sort.indexOf(id_dict[key].witnesses[0]) === -1) {
                			keys_to_sort.push(id_dict[key].witnesses[0]);
                		    } 
                		    if (id_dict[key].witnesses.indexOf(hand) !== -1) {
                			highlighted = 'highlighted ';
                		    }
                		    subrow_id = row_id + '_word_' + j + '_rule_' + key;
                		    rule_cells.push('<tr class="' + reg_class + highlighted + '" id="' + subrow_id + '"><td>');
                		    if (id_dict[key].witnesses.indexOf(hand) !== -1) {
                			rule_cells.push('<div class="spanlike">');
                		    }
                		    rule_cells.push(id_dict[key].t.replace(/_/g, '&#803;'));
                		    rule_cells.push(' &#9654; ')
                		    rule_cells.push(id_dict[key].n.replace(/_/g, '&#803;'));
                		    if (id_dict[key].witnesses.indexOf(hand) !== -1) {
                			rule_cells.push('</div>');
                		    }
                		    rule_cells.push('</td></tr>');
                		    if (cells_dict.hasOwnProperty(id_dict[key].witnesses[0])) {
                			cells_dict[id_dict[key].witnesses[0]].push(rule_cells.join(' '));
                		    } else {
                			cells_dict[id_dict[key].witnesses[0]] = [rule_cells.join(' ')];
                		    }               		    
                		    events[subrow_id] = id_dict[key].scope + ': ' + RG.get_reg_wits_as_string(id_dict[key].witnesses);
                		}
                	    }
                	    keys_to_sort = CL.sort_witnesses(keys_to_sort);
                	    for (k = 0; k < keys_to_sort.length; k += 1) {
                		if (cells_dict.hasOwnProperty(keys_to_sort[k])) {
                		    cells.push(cells_dict[keys_to_sort[k]].join(' '));
                		}
                	    }
                	    cells.push('</tbody></table>');
                	}
                	cells.push('</td>');
                    }
                }
                cells.push('</tr>');
                rows.push(cells.join(''));
            }
            html.push('<td class="start_' + start + '" colspan="' + (end - start + 1) + '"><div class="drag_div" id="drag' + id + '">');
            html.push('<table class="variant_unit" id="variant_unit_' + id + '">');
            html.push(U.TEMPLATE.replace_all(rows.join(''), 'MX_LN', String(max_length + 1)));
            html.push('<tr><td class="mark" colspan="' + (max_length + 1) + '"><span id="add_reading_' + id + '">+</span></td></tr>');
            html.push('</table>');
            html.push('</div></td>');
            return [html, row_list, events];
        },
        
        has_deletion_scheduled: function (rule_id) {
            var i;
            for (i = 0; i < RG._for_deletion.length; i += 1) {
        	if (RG._for_deletion[i]._id === rule_id) {
        	    return true;
        	}
            }
            for (i = 0; i < RG._for_global_exceptions.length; i += 1) {
        	if (RG._for_global_exceptions[i]._id === rule_id) {
        	    return true;
        	}
            }
            return false;
        },
        
        get_reg_wits_as_string: function (wit_list) {
            var i, new_wits;
            new_wits = [];
            for (i = 0; i < wit_list.length; i += 1) {
        	new_wits.push(CL.processes_hand_id(wit_list[i]));
            }
            return new_wits.join(', ');
        },

        recollate: function (reset_scroll) {
            var options, scroll_offset;
            SPN.show_loading_overlay();
            if (reset_scroll === undefined) {
                reset_scroll = false;
            }
            scroll_offset = 0;
            if (!reset_scroll) {
                scroll_offset = [document.getElementById('scroller').scrollLeft,
                                 document.getElementById('scroller').scrollTop];
            }
            RG._rule_words_summary = {};
            if ($.isEmptyObject(CL._collate_data)) {
        	RG.get_collation_data(CL._data_settings.collation_source, 'units', scroll_offset, function () {RG.run_collation(CL._collate_data, 'units', scroll_offset);}); //collation_source, output, scroll_offset, callback
            } else {
        	RG.run_collation(CL._collate_data, 'units', scroll_offset);
            }
        },
        
        run_collation: function (collation_data, output, scroll_offset) {
            CL._services.update_ruleset(RG._for_deletion, RG._for_global_exceptions, RG._rules, CL._context, function() {
        	RG._for_deletion = [];
        	RG._for_global_exceptions = [];
        	RG._rules = [];
        	RG.fetch_rules(collation_data, function (rules) {
        	    RG.do_run_collation(collation_data, rules, output, scroll_offset);
        	});
            });
        },
        
        do_run_collation: function (collation_data, rules, output, scroll_offset) {
            var options, setting, result_callback, data_settings,
            algorithm_settings, display_settings;
            options = {};
            options.rules = rules;
            if (!$.isEmptyObject(CL._local_python_functions)) {
        	options.local_python_functions = CL._local_python_functions;
            }
            options.data_input = collation_data;
            if (CL._project.hasOwnProperty('_id')) {
        	options.project = CL._project._id;
            }            
            //data settings
            data_settings = {};
            data_settings.base_text = CL._data_settings.base_text;
            data_settings.base_text_siglum = CL._data_settings.base_text_siglum;
            data_settings.language = CL._data_settings.language;
            data_settings.witness_list = CL._data_settings.witness_list;
            options.data_settings = data_settings;
            
            display_settings = {};
            for (setting in CL._display_settings) {
        	if (CL._display_settings.hasOwnProperty(setting)) {
        	    if (CL._display_settings[setting] === true) {
        		display_settings[setting] = CL._display_settings[setting];
        	    }
        	}
            }
            options.display_settings = display_settings;
            options.display_settings_config = CL._display_settings_details;
            
            options.rule_conditions_config = CL._rule_conditions;
            
            algorithm_settings = {};
            for (setting in CL._algorithm_settings) {
        	if (CL._algorithm_settings.hasOwnProperty(setting)) {
        	    if (CL._algorithm_settings[setting] !== false) {
        		algorithm_settings[setting] = CL._algorithm_settings[setting];
        	    }
        	}
            }
            options.algorithm_settings = algorithm_settings;
            
            if (output === 'table') {
        	if (document.getElementById('book').value !== 'none' 
        		&& document.getElementById('chapter').value !== 'none' 
        		    && document.getElementById('verse').value !== 'none') {

        	    CL._context = document.getElementById('book').value + 'K' 
        	    + document.getElementById('chapter').value 
        	    + 'V' + document.getElementById('verse').value;

        	    result_callback = function (data) {

        		RG.show_collation_table(CL._data, CL._context, document.getElementById('container'));
        	    };
        	    options.accept = 'json';
        	} else {
        	    return;
        	}

            } else {
        	result_callback = function (data) {
        	    CL._data = data;
        	    CL._data = CL.integrate_lac_om_readings(CL._data);                   
        	    CL._data_settings.base_text_siglum = data.overtext_name;
        	    RG.show_verse_collation(CL._data, CL._context, document.getElementById('container'));
        	    if (scroll_offset !== undefined) {
        		document.getElementById('scroller').scrollLeft = scroll_offset[0];
        		document.getElementById('scroller').scrollTop = scroll_offset[1];
        	    }
        	};
            }
            options.error = function () {
        	alert(CL._context + ' does not work.\nIf all verses have stopped working then collate has probably crashed.');
        	SPN.remove_loading_overlay();
            };
            CL._services.do_collation(CL._context, options, result_callback);
        },
        
        fetch_rules: function (collation_data, callback) {
            //get the rules according to the appropriate service
            CL._services.get_rules(CL._context, function (rules) {
        	callback(rules);
            });
        },

        show_verse_collation: function (data, context, container, options) {
            var html, i, last_row, tr, temp, event_rows, row, triangles, bk, ch, v, nextCh, nextV, prevCh, prevV,
                header, unit_events, key, global_exceptions_html;
            console.log(data);
            
            if (typeof options === 'undefined') {
        	options = {};
            }
            if (!options.hasOwnProperty('highlighted_wit') && CL._highlighted !== 'none') {
        	options.highlighted_wit = CL._highlighted;
            }
            options.sort = true;
            SimpleContextMenu.setup({'preventDefault' : true, 'preventForms' : false});
            SimpleContextMenu.attach('regularised', function () {return RG.make_menu('regularised')});
            SimpleContextMenu.attach('regularised_global', function () {return RG.make_menu('regularised_global')});
            CL.lac_om_fix();
            temp = CL.get_unit_layout(CL._data.apparatus, 1, 'regularise', options);
            header = CL.get_collation_header(CL._data, temp[1], false);
            html = header[0];
            html.push.apply(html, temp[0]);
            html.push('<ul id="context_menu" class="SimpleContextMenu"></ul>');
            document.getElementById('header').innerHTML = CL.get_header_html('Regulariser', CL._context);
            CL._services.show_login_status();
            document.getElementById('header').className = 'regularisation_header';
            global_exceptions_html = '<div id="global_exceptions" class="dragdiv" style="display:none"><div id="global_exceptions_header"><span>Global exceptions</span><span id="global_exceptions_ex">&#9660;</span></div><div id="global_exceptions_list" style="display:none"></div></div>';
            container.innerHTML = '<div id="scroller" class="fillPage"><table class="collation_overview">'
                    + html.join('') + '</table>' + global_exceptions_html + '</div><div id="single_witness_reading"></div>';
            CL.expandFillPageClients();
            //document.getElementById('scroller').style.height = window.innerHeight - document.getElementById('footer').offsetHeight - document.getElementById('header').offsetHeight - 40 + 'px';
            document.getElementById('footer').innerHTML = '<input id="expand_collapse_button" type="button" value="expand all"/>'
        	+ '<input id="show_hide_regularisations_button" type=button value="show regularisations"/>'
        	+ '<span id="stage_links"></span>'
                + '<select class="right_foot" id="highlighted" name="highlighted"></select>'
                + '<input class="right_foot" id="settings_button" type="button" value="settings"/>'
                + '<input class="right_foot" id="recollate_button" type="button" value="recollate"/>'
                + '<input class="right_foot" id="save_button" type="button" value="save"/>'
                + '<input class="right_foot" id="go_to_sv_button" type="button" value="move to set variants"/>';
            if (RG._show_regularisations === true) {
        	CL._services.get_rule_exceptions(CL._context, function(rules) {
        	    if (rules.length > 0) {
        		RG.show_global_exceptions(rules);
        	    } else {
        		return;
        	    }
        	});
            }

            SPN.remove_loading_overlay();
            CL.add_stage_links();
            $('#go_to_sv_button').on('click',
        	    function (event) {
                	var extra_results;
                	SPN.show_loading_overlay();
                	//check that there are no rules in stacks waiting to be added/deleted/have exceptions made etc. 
                	if (RG.all_rule_stacks_empty()) {
                	    if (SV.are_all_units_complete()) { //check nothing is lost and we have a full complement of witnesses for each unit
                		extra_results = CL.apply_pre_stage_checks('set_variants');
                		if (extra_results[0] === true) {
                		    RG.remove_unrequired_data() //remove the key-value pairs we don't need anymore
                		    CL._data.marked_readings = {}; //added for SV
                		    CL.add_unit_and_reading_ids(); //added for SV
                		    SV.show_set_variants({'container': container});
                		    document.getElementById('scroller').scrollLeft = 0;
                		    document.getElementById('scroller').scrollTop = 0;
                		} else {
                		    if (CL._show_subreadings === true) {
                			SV._find_subreadings()
                		    }
                		    alert(extra_results[1]);
                		    SPN.remove_loading_overlay();
                		}
                	    } else {
                		alert('You cannot move to set variants because one of the units does not have all of its required witnesses');
                		SPN.remove_loading_overlay();
                	    }
                	} else {
                	    alert('You must recollate before moving to set variants because there are rule changes that have not yet been applied.');
                	    SPN.remove_loading_overlay();
                	}
                    });
            $('#settings_button').on('click',
                    function (event) {CL.show_settings(); });
            $('#recollate_button').on('click',
                    function (event) {RG.recollate(); });
            $('#save_button').on('click',
                    function (event) {CL.save_collation('regularised'); });   
            CL.add_triangle_functions('table');
            U.FORMS.populate_select(SV.get_hands_and_sigla(), document.getElementById('highlighted'), 'document', 'hand', options.highlighted_wit);
            //TODO: probably better in for loop
            i = 0;
            while (i <= temp[4]) {
                if (document.getElementById('drag' + i) !== null) {
                    RG.redips_init_regularise('drag' + i);
                }
                if (document.getElementById('add_reading_' + i) !== null) {
                    RG.add_new_token(document.getElementById('add_reading_' + i));
                }
                i += 1;
            }
            $('#highlighted').on('change', function (event) {               
                RG.highlight_witness(event.target.value);
            });
            RG.show_regularisations();

	    CL.make_verse_links();

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
        },
        
        all_rule_stacks_empty: function () {
            if (RG._rules.length > 0 || RG._for_deletion.length > 0 || RG._for_global_exceptions.length > 0) {
        	return false;
            } 
            return true;
        },
        
        remove_unrequired_data: function () {
            var i, j, k;
            for (i = 0; i < CL._data.apparatus.length; i += 1) {
        	for (j = 0; j < CL._data.apparatus[i].readings.length; j += 1) {
        	    for (k = 0; k < CL._data.apparatus[i].readings[j].text.length; k += 1) {
        		if (CL._data.apparatus[i].readings[j].text[k].hasOwnProperty('rule_string')) {
        		    delete CL._data.apparatus[i].readings[j].text[k].rule_string;
        		}
        	    }
        	}
            }
        },
        
        show_regularisations: function () {
            if (RG._show_regularisations === true) {
		if (document.getElementById('show_hide_regularisations_button')) {
		    document.getElementById('show_hide_regularisations_button').value = document.getElementById('show_hide_regularisations_button').value.replace('show', 'hide');
		    $('#show_hide_regularisations_button').on('click.hide_regularisations', function (event) {
			var scroll_offset;
			SPN.show_loading_overlay();
			scroll_offset = [document.getElementById('scroller').scrollLeft,
			                 document.getElementById('scroller').scrollTop];
			RG._show_regularisations = false;
			RG.show_verse_collation(CL._data, CL._context, CL._container);
			document.getElementById('scroller').scrollLeft = scroll_offset[0];
			document.getElementById('scroller').scrollTop = scroll_offset[1];
		    });
		}		
	    } else {
		if (document.getElementById('show_hide_regularisations_button')) {		  
		    document.getElementById('show_hide_regularisations_button').value = document.getElementById('show_hide_regularisations_button').value.replace('hide', 'show');
		    $('#show_hide_regularisations_button').on('click.show_regularisations', function (event) {
    			var scroll_offset;
    			SPN.show_loading_overlay();
    			scroll_offset = [document.getElementById('scroller').scrollLeft,
    			                 document.getElementById('scroller').scrollTop];
    			RG._show_regularisations = true;
    			RG.show_verse_collation(CL._data, CL._context, CL._container);
    			document.getElementById('scroller').scrollLeft = scroll_offset[0];
    			document.getElementById('scroller').scrollTop = scroll_offset[1];
    		    });
		}
	    }
        },
        
        highlight_witness: function (witness) {
            var scroll_offset;
            scroll_offset = [document.getElementById('scroller').scrollLeft,
		             document.getElementById('scroller').scrollTop];
            CL._highlighted = witness;
            RG.show_verse_collation(CL._data, CL._context, CL._container, {'highlighted_wit' :witness});
            document.getElementById('scroller').scrollLeft = scroll_offset[0];
            document.getElementById('scroller').scrollTop = scroll_offset[1];
            if (witness !== 'none') {
        	CL.get_highlighted_text(witness);
            }
        },

        add_new_token: function (element) {
            var last_row, event, tr;
            $(element).on('click', function (event) {
                last_row = event.target.parentNode.parentNode;
                tr = document.createElement('tr');
                tr.innerHTML = '<td colspan="' + event.target.parentNode.getAttribute('colspan') + '"><input type="text" size="10"/></td>';
                last_row.parentNode.insertBefore(tr, last_row);
            });
        },

        create_rule: function (data, user, original_text, normalised_text, unit, reading, word, witnesses) {
            var rule, rules, witness, context, i, j, reconstructed_readings;
          //first we work out which tokens we have regularised so we can keep them greyed out if the page has to be redrawn for any reason
            for (i = 0; i < witnesses.length; i += 1) {
        	if (!RG._rule_words_summary.hasOwnProperty(witnesses[i])) {
                    RG._rule_words_summary[witnesses[i]] = {};         
                } 
                if (RG._rule_words_summary[witnesses[i]].hasOwnProperty('index')) {
                    RG._rule_words_summary[witnesses[i]].index.push(CL.get_word_index_for_witness(unit, reading, word, witnesses[i]));
                } else {                        
                    RG._rule_words_summary[witnesses[i]].index = [CL.get_word_index_for_witness(unit, reading, word, witnesses[i])];
                }
            }
            //now sort text out so that anything we turned to &lt; or &gt; get stored as < and >
            original_text = original_text.replace('&lt;', '<').replace('&gt;', '>');
            normalised_text = normalised_text.replace('&lt;', '<').replace('&gt;', '>');
            //now make the rules
            if (data.scope === 'always' || data.scope === 'verse') {
                rule = {'_model' : 'decision', 'type' : 'regularisation', 'scope' : data.scope,  'class' : data['class'] || 'none', 'active' : true, 't' : original_text, 'n' : normalised_text};
                if (data.hasOwnProperty('comments')) {
                    rule.comments = data.comments;
                }
                if (data.hasOwnProperty('conditions')) {
                    rule.conditions = data.conditions;
                }
                if (data.scope === 'always') {
                    rule.context = {};
                } else if (data.scope === 'verse') {
                    rule.context = {};
                    rule.context.unit = CL._context;
                }
                if (CL._project.hasOwnProperty('_id')) {
                    rule.project = CL._project._id;
                }
                if (CL._project.hasOwnProperty('_id')) {
                    rule.project = CL._project._id;
                } else {
                    rule.user = user._id;
                }
                return [rule];
            }
            if (data.scope === 'manuscript' || data.scope === 'once') {
                rules = [];
                for (i = 0; i < witnesses.length; i += 1) {
                    witness = witnesses[i];
                    rule = {'_model' : 'decision', 'type' : 'regularisation', 'scope' : data.scope, 'class' : data['class'] || 'none', 'active' : true, 'n' : normalised_text};
                    if (data.hasOwnProperty('comments')) {
                        rule.comments = data.comments;
                    }
                    if (data.hasOwnProperty('conditions')) {
                        rule.conditions = data.conditions;
                    }
                    if (CL._project.hasOwnProperty('_id')) {
                        rule.project = CL._project._id;
                    } else {
                	rule.user = user._id;
                    }
                    //check to see if witness already has a reconstructed rule applied and if so make sure we are ignoring the presence of underdots and []
                    if (CL._data.apparatus[unit].readings[reading].text[word][witness].hasOwnProperty('decision_class')) {
                	reconstructed_readings = [];
                	for (j = 0; j < CL._project.rule_classes; j += 1) {
                	    if (CL._project.rule_classes[j].hasOwnProperty('reconstructedreading') && CL._project.rule_classes[j].reconstructedreading === true) {
                		reconstructed_readings.push(CL._project.rule_classes[j].value);
                	    }
                	}
                	for (j = 0; j < CL._data.apparatus[unit].readings[reading].text[word][witness].decision_class.length; j += 1) {
                	    if (reconstructed_readings.indexOf(CL._data.apparatus[unit].readings[reading].text[word][witness].decision_class) !== -1) {
                		if (!rule.conditions) {
                                    rule.conditions = {};
                                }
                                rule.conditions.ignore_supplied = true;
                                rule.conditions.ignore_unclear = true;
                	    }
                	}
                    }
                    if (data.scope === 'manuscript') {
                        rule.context = {'witness' : witness};
                        rule.t = original_text;
                    } else if (data.scope === 'once') {
                	context = {};
                	context.unit = CL._context;
                	context.witness = witness;
                        context.word = CL.get_word_index_for_witness(unit, reading, word, witness);
                        rule.context = context;
                        rule.t = CL.get_word_token_for_witness(unit, reading, word).replace('&lt;', '<').replace('&gt;', '>');
                    }
                    rules.push(rule);
                }
                return rules;
            }
        },       

        redips_init_regularise: function (id) {
            var rd, data, clone, original_form, normalised_form, normalised_text,
                reg_menu, scope, clas, comments, witnesses, context, unit_data,
                witness, unit, reading, word, original, original_text, suffix,
                reg_rules, key, new_reg_rules, selected, ignore_supplied, ignore_unclear,
                create_function, original_display_text;
            rd = REDIPS.drag;
            rd.init(id);
            rd.event.dropped = function () {
                clone = document.getElementById(rd.obj.id);
                original = document.getElementById(rd.objOld.id);
                normalised_form = rd.td.target.childNodes[0];
                //if we are normalising to a typed in value
                if (normalised_form.tagName === 'INPUT') {
                    normalised_text = normalised_form.value.trim();
                    if (/^\s*$/.test(normalised_text) === false) { //it there is at least one non-space character
                	if (/^\S+\s\S/.test(normalised_text) === true) {// if there are two or more strings separated by a space
                	    //you have typed a space into the box with is not allowed, regularisation is single token to single token only!
                	    if (clone.parentNode !== null) {
                                clone.parentNode.removeChild(clone);
                            }
                	    alert('You are not allowed to regularise to multiple tokens, the normalised form must not include spaces.\nIf you need to regularise to multiple words this can be done in the Set Variants interface');
                	    return;
                	} else {
                	    //you are asking to regularise a single token to a single token that is allowed and we will continue
                	    rd.td.target.innerHTML = '<div>' + normalised_text.replace('<', '&lt;').replace('>', '&gt;') + '</div>';
                	}
                    } else {
                        //you are trying to normalise to an empty string so stop it!
                        if (clone.parentNode !== null) {
                            clone.parentNode.removeChild(clone);
                        }
                        return;
                    }
                } else { // we are normalising to an existing value
                    normalised_text = normalised_form.childNodes[0].textContent;
                } 
                normalised_text = normalised_text.replace(/̣/g, '_');
                //stop the dragged clone being added to the dom
                if (clone.parentNode !== null) {
                    clone.parentNode.removeChild(clone);
                }
                unit_data = rd.objOld.id;
                //get the unit, reading and word data to lookup stuff in data structure
                unit = parseInt(unit_data.substring(0, unit_data.indexOf('_r')).replace('variant_unit_', ''), 10);
                reading = parseInt(unit_data.substring(unit_data.indexOf('_r') + 2, unit_data.indexOf('_w')), 10);
                word = parseInt(unit_data.substring(unit_data.indexOf('_w') + 2), 10);
                witnesses = CL._data.apparatus[unit].readings[reading].witnesses;
                original_text = CL._data.apparatus[unit].readings[reading].text[word].rule_string; 
                original_display_text = CL._data.apparatus[unit].readings[reading].text[word]['interface']; 
                if (document.getElementById('reg_form') !== null) {
                    document.getElementsByTagName('body')[0].removeChild(document.getElementById('reg_form'));
                }
                create_function = function () {
                	var i, data, new_unit, new_unit_data, new_reading, new_witnesses, suffix;
                        //create the rule
                	//make sure all the data (even any disabled ones are submitted)
                	$('#conditions input').removeAttr('disabled');
                        if (document.getElementById('scope').value === 'none') {
                            return false;
                        }
                        data = U.FORMS.serialize_form('regularisation_menu');
                        if (!data.hasOwnProperty('class')) {
                            data['class'] = 'none';
                        }
                        CL._services.get_user_info(function (user) {
                            RG._rules.push.apply(RG._rules, RG.create_rule(data, user, original_text, normalised_text, unit, reading, word, witnesses));
                        });
                        document.getElementsByTagName('body')[0].removeChild(document.getElementById('reg_form'));
                        rd.enableDrag(false, rd.objOld);
                        $(original).addClass('regularised');
                        $(original.parentNode).addClass('mark');
                        //add witnesses to normalised form in data structure
                        new_unit_data = rd.td.target.firstChild.id;
                        if (new_unit_data !== '') { //only try this if it is not a user added reading
                            new_unit = parseInt(new_unit_data.substring(0, new_unit_data.indexOf('_r')).replace('variant_unit_', ''), 10);
                            new_reading = parseInt(new_unit_data.substring(new_unit_data.indexOf('_r') + 2, new_unit_data.indexOf('_w')), 10);
                            //TODO: check this isn't causing problems by not eliminating suffixes.
                            new_witnesses = CL.get_reading_witnesses(CL._data.apparatus[unit].readings[reading]);
                            if (CL._project.hasOwnProperty('_id')) {
                                for (i = 0; i < new_witnesses.length; i += 1) {
                                    suffix = RG.get_suffix(data['class']);
                                    CL._data.apparatus[new_unit].readings[new_reading].witnesses.push(new_witnesses[i] + suffix);
                                }
                            }
                        }
                        
                };
                $.get('http://' + SITE_DOMAIN + '/collation/htmlfragments/rule_menu.html', function (html) {
                    reg_menu = document.createElement('div');
                    reg_menu.setAttribute('id', 'reg_form');
                    reg_menu.setAttribute('class', 'reg_form');
                    reg_menu.innerHTML = U.TEMPLATE.substitute(html, {'unit_data' : unit_data,
                        'original_text' : original_display_text.replace(/_/g, '&#803;'),
                        'normalised_text' : normalised_text.replace(/_/g, '&#803;')});
                    document.getElementsByTagName('body')[0].appendChild(reg_menu);
                    reg_rules = CL._get_rule_classes('create_in_RG', true, 'value', ['identifier', 'name', 'RG_default']);
                    new_reg_rules = [];
                    selected = 'none';
        		for (key in reg_rules) {
        		    if (reg_rules.hasOwnProperty(key)) {
        			if (typeof reg_rules[key][0] !== 'undefined') {
        			    new_reg_rules.push({'value': key, 'label': reg_rules[key][1] + ' (' + reg_rules[key][0] + ')'});
        			} else {
        			    new_reg_rules.push({'value': key, 'label': reg_rules[key][1]});
        			}
        			if (reg_rules[key][2] === true) {
        			    selected = key;
        			}
        		    }
        		}
        		RG.set_up_rule_menu(rd, new_reg_rules, selected, create_function);
                }, 'text');
            };
        },
        
        get_display_setting_value: function (id, key) {
            var i;
            for (i = 0; i < CL._display_settings_details.configs.length; i += 1) {
        	if (CL._display_settings_details.configs[i].id === id) {
        	    return CL._display_settings_details.configs[i][key];
        	}
            }
            return null;
        },
        
        set_up_rule_menu: function (rd, classes, selected, create_function) {
            var left_pos, window_width, rule_scopes, conditions_html, i, id, setting;
            document.getElementById('reg_form').style.width = '300px';
            window_width = window.innerWidth;
            left_pos = rd.td.current.offsetLeft + rd.obj.redips.container.offsetParent.offsetLeft - document.getElementById('scroller').scrollLeft
            if (left_pos + parseInt(document.getElementById('reg_form').style.width) >= window_width) {
                left_pos = (window_width - parseInt(document.getElementById('reg_form').style.width) - 20);
            }
            //hardcoded this now as a fail safe against overshooting the bottom of the page, extra tests could be added if you have time.
            //document.getElementById('reg_form').style.top = (rd.td.current.offsetTop + rd.obj.redips.container.offsetParent.offsetTop - document.getElementById('scroller').scrollTop) + 'px';
            document.getElementById('reg_form').style.left = left_pos + 'px';
            
            rule_scopes = RG.get_rule_scopes();
            U.FORMS.populate_select(rule_scopes, document.getElementById('scope'), 'value', 'label', undefined, false);
            U.FORMS.populate_select(classes, document.getElementById('class'), 'value', 'label', selected, false);
            conditions_html = [];
            for (i = 0; i < CL._rule_conditions.configs.length; i += 1) {
                id = 'conditions_' + CL._rule_conditions.configs[i].id;
                conditions_html.push('<label for="' + id + '">' + CL._rule_conditions.configs[i].label);
                conditions_html.push('<input type="checkbox" class="boolean" id="' + id + '" name="' + id + '"/>');
                conditions_html.push('</label><br/>');
            }
            document.getElementById('conditions').innerHTML = conditions_html.join('');
            
            for (i = 0; i < CL._rule_conditions.configs.length; i += 1) {
        	if (CL._rule_conditions.configs[i].hasOwnProperty('linked_to_settings') && CL._rule_conditions.configs[i].linked_to_settings === true) {
        	    setting = CL._rule_conditions.configs[i].setting_id;
        	    id = 'conditions_' + CL._rule_conditions.configs[i].id;
        	    if (CL._display_settings[setting] === RG.get_display_setting_value(setting, 'apply_when')) {
        		document.getElementById(id).checked = true;
                        document.getElementById(id).disabled = true;
        	    }
        	}
            }
            $('#cancel_button').on('click', function (event) {
                document.getElementsByTagName('body')[0].removeChild(document.getElementById('reg_form'));
            });
            $('#save_rule_button').on('click', create_function);
        },
        
        get_rule_scopes: function () {
            var rule_scopes, scopes_and_labels, allowed_scopes, key; 
            allowed_scopes = ['once', 'verse', 'manuscript', 'always'];
            rule_scopes = CL._services.supported_rule_scopes;
            scopes_and_labels = [];
            for (key in rule_scopes) {
        	if (rule_scopes.hasOwnProperty(key) && allowed_scopes.indexOf(key) !== -1) {
        	    scopes_and_labels.push({'value': key, 'label': rule_scopes[key]});
        	}
            }       
            return scopes_and_labels;
        },
        
        get_suffix: function (decision_class) {
            var i, suffix;
            suffix = '';
            for (i = 0; i < CL._project.rule_classes.length; i += 1) {
        	if (CL._project.rule_classes[i].value === decision_class) {
        	    if (CL._project.rule_classes[i].hasOwnProperty('suffixed_sigla') && CL._project.rule_classes[i].suffixed_sigla === true && typeof CL._project.rule_classes[i].identifier !== 'undefined') {
        		suffix += CL._project.rule_classes[i].identifier;
        	    }
        	}
            }
            return suffix;
        },


        
        make_menu: function (menu_name) {
            if (menu_name === 'regularised') {
        	document.getElementById('context_menu').innerHTML = '<li id="delete_rule"><span>Delete rule</span></li>';
            }
            if (menu_name === 'regularised_global') {
        	document.getElementById('context_menu').innerHTML = '<li id="add_exception"><span>Add exception</span></li><li id="delete_rule"><span>Delete rule</span></li>';
            }
            RG._add_CM_Handlers();
	    return 'context_menu';
        },
        
        _get_ancestor_row: function (element) {
            if (element.tagName === 'TR') {
                return element;
            } else {
                while (element.tagName !== 'TR' && element.tagName !== 'BODY') {
                    element = element.parentNode;
                }
                return element;                
            }
        },
        
        show_global_exceptions: function (rules) {
            var html, i;
            if (document.getElementById('global_exceptions').style.display === 'none') {
                document.getElementById('global_exceptions').style.display = 'block';
                document.getElementById('global_exceptions_list').style.display = 'block';
                DND.InitDragDrop(true, false);
            }
            html = [];
            html.push('<form id="global_exceptions_form">');
            html.push('<span>To remove exception/s check the box/es and click the button.</span><br/><br/>');
            for (i = 0; i < rules.length; i += 1) {
        	html.push('<label for="checkbox_' + rules[i]._id + '">' + rules[i].t + ' &gt; ' + rules[i].n + '</label>');
        	html.push('<input type="checkbox" name="' + rules[i]._id + '" id="checkbox_' + rules[i]._id + '"/><br/>');
            }
            html.push('<br/><input type="button" value="Remove exceptions" id="remove_exception_button"/>');
            html.push('</form>');
            document.getElementById('global_exceptions_list').innerHTML = html.join('');
            document.getElementById('global_exceptions').style.top = document.getElementById('header').offsetHeight 
		+ document.getElementById('scroller').offsetHeight 
		- document.getElementById('global_exceptions').offsetHeight
		- 3 
		+ 'px';
            $('#remove_exception_button').off('click.rem_ge');
            $('#remove_exception_button').on('click.rem_ge', function(event) {
        	RG.remove_global_exceptions();
            });
            $('#global_exceptions_ex').on('click', function (event) {
            	if (document.getElementById('global_exceptions_list').style.display === 'block') {
            	    document.getElementById('global_exceptions').style.top = parseInt(document.getElementById('global_exceptions').style.top) + parseInt(document.getElementById('global_exceptions_list').offsetHeight) + 'px';
            	    document.getElementById('global_exceptions_list').style.display = 'none';
            	    document.getElementById('global_exceptions_ex').innerHTML = '&#9650;';
            	} else {
            	    document.getElementById('global_exceptions_list').style.display = 'block';
            	    document.getElementById('global_exceptions').style.top = parseInt(document.getElementById('global_exceptions').style.top) - parseInt(document.getElementById('global_exceptions_list').offsetHeight) + 'px';
            	    document.getElementById('global_exceptions_ex').innerHTML = '&#9660;';
            	}
            });
        },
        
        remove_global_exceptions: function () {
            var data, key, rule_ids;
            data = U.FORMS.serialize_form('global_exceptions_form');
            rule_ids = [];
            for (key in data) {
        	rule_ids.push(key);
            }
            //get the rules
            if (rule_ids.length > 0) {
        	CL._services.get_rules_by_ids(rule_ids, function(rules) {
        	    var i;
        	    //remove this context from exceptions
        	    for (i = 0; i < rules.length; i += 1) {
        		if (rules[i].hasOwnProperty('exceptions')) {
        		    if (rules[i].exceptions.indexOf(CL._context) !== -1) {
        			rules[i].exceptions.splice(rules[i].exceptions.indexOf(CL._context), 1);
        			if (rules[i].exceptions.length === 0) {
        			    delete rules[i].exceptions;
        			}
        		    }
        		}
        	    }
        	    //resave the rules
        	    console.log(rules)
        	    CL._services.update_rules(rules, CL._context, function() {
        		RG.recollate(false);
        	    });
        	})
            }
        },
        
        schedule_add_global_exception: function () {
            var element, row, rule_id;
            element = SimpleContextMenu._target_element;
            row = RG._get_ancestor_row(element);
            rule_id = row.id.substring(row.id.indexOf('_rule_') + 6);          
            RG._for_global_exceptions.push({'_id': rule_id});
            $(row).addClass('deleted');
        },
        
        schedule_rule_deletion: function() {
            var i, j, element, row, rule_id, unit_num, row_num, word_num, rule_type, word_data, key, witness_data, witnesses, ok;
            element = SimpleContextMenu._target_element;
            row = RG._get_ancestor_row(element);
            unit_num = row.id.substring(row.id.indexOf('_unit_') + 6, row.id.indexOf('_row_'));
            row_num = row.id.substring(row.id.indexOf('_row_') + 5, row.id.indexOf('_word_'));
            word_num = row.id.substring(row.id.indexOf('_word_') + 6, row.id.indexOf('_rule_'));
            rule_id = row.id.substring(row.id.indexOf('_rule_') + 6);
            word_data = CL._data.apparatus[unit_num].readings[row_num].text[word_num];
            witnesses = word_data.reading;
            rule_type = null;
            i = 0;
            while (i < witnesses.length && rule_type === null) {
        	witness_data = word_data[witnesses[i]];
        	if (witness_data.hasOwnProperty('decision_details')) {
        	    j = 0;
        	    while (j < witness_data.decision_details.length && rule_type === null) {
        		if (rule_id === witness_data.decision_details[j]._id) {
        		    rule_type = witness_data.decision_details[j].scope;
        		}		
        		j += 1;
        	    }
        	}
        	i += 1;
            }
            if (rule_type === 'always') {
        	ok = confirm('You are asking to delete a global rule.\nDeleting this rule will mean it is deleted everywhere in your project for all editors.\nIf you just want the rule to be ignored in this verse you can add an exception.\nAre you sure you want to delete this rule?')
        	if (ok) {
        	    $(row).addClass('deleted');
                    RG._for_deletion.push({ _id : rule_id, scope : rule_type });
        	} else {
        	    return;
        	}
            } else {
        	$(row).addClass('deleted');
	        RG._for_deletion.push({ _id : rule_id, scope : rule_type });
            }
        },
        
        _add_CM_Handlers: function () {
            if (document.getElementById('delete_rule')) {
        	$('#delete_rule').off('click.dr_c');
        	$('#delete_rule').off('mouseover.dr_mo');
        	$('#delete_rule').on('click.dr_c', function(event) {RG.schedule_rule_deletion();});
        	$('#delete_rule').on('mouseover.dr_mo', function(event) {CL.hide_tooltip();});
            }
            if (document.getElementById('add_exception')) {
        	$('#add_exception').off('click.ae_c');
        	$('#add_exception').off('mouseover.ae_mo');
        	$('#add_exception').on('click.ae_c', function(event) {RG.schedule_add_global_exception();});
        	$('#add_exception').on('mouseover.ae_mo', function(event) {CL.hide_tooltip();});
            }
        },

        show_collation_table: function (data, context, container) {
            var i, j, k, html, column, row, witnesses;
            console.log(data);
            html = [];
            html.push('<tr>');
            //sigils for collateX 1.3 witnesses for 1.5+
            if (data.hasOwnProperty('sigils')) {
        	witnesses = data.sigils;
            } else {
        	witnesses = data.witnesses;
            }
            for (i = 0; i < witnesses.length; i += 1) {
                html.push('<td>' + witnesses[i] + '</td>');
            }
            html.push('</tr>');
            for (i = 0; i < data.table.length; i += 1) {
                row = data.table[i];
                html.push('<tr>');
                for (j = 0; j < row.length; j += 1) {
                    column = row[j];
                    if (column === null) {
                        html.push('<td></td>');
                    } else {
                        html.push('<td>');
                        for (k = 0; k  < column.length; k += 1) {
                            if (column[k].hasOwnProperty('n')) {
                                html.push(column[k].n);
                            } else {
                                html.push(column[k].t);
                            }
                            html.push(' ');
                        }
                        html.push('</td>');
                    }
                }
                html.push('</tr>');
            }
            container.innerHTML = '<div id="scroller"><table id="raw_json"><tbody>' + html.join('') + '</tbody></table></div>';
        },
    };
}());
