var U = (function () {
	
    return {
    	
    	generate_uuid: function () {
			var new_uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
				var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
				return v.toString(16);
			});
			return new_uuid;
		},

    	FORMS: (function () {
            return {
            	
            	/** validate a form to check all fields with required
                    className are complete
                    and all data entered conforms to type required by
                    className attribute on element */
                validate_form: function (form_id) {
                    var i, elems, missing_list, invalid_list, result;
                    missing_list = [];
                    invalid_list = [];
                    elems = document.getElementById(form_id).elements;
                    for (i = 0; i < elems.length; i += 1) {
                        result = U.FORMS.validate_element(elems[i]);
                        if (result.invalid === true) {
                            invalid_list.push(elems[i].id);
                        }
                        if (result.missing === true) {
                            missing_list.push(elems[i].id);
                        }
                    }
                    if (missing_list.length === 0 && invalid_list.length === 0) {
                        return {'result': true, 'missing': missing_list, 'invalid': invalid_list};
                    }
                    return {'result': false, 'missing': missing_list, 'invalid': invalid_list};
                },

                /** */
                validate_element: function (elem) {
                    var missing, invalid;
                    missing = false;
                    invalid = false;
                    //only need to type validate free text fields input
                    //type=text and textarea and only
                    //if we don't require strings
                    if ((elem.tagName === 'INPUT' && elem.type === 'text') ||
                        elem.tagName === 'TEXTAREA') {
                        if ($(elem).hasClass('integer') &&
                            elem.value.length > 0) {
                            if (isNaN(parseInt(elem.value, 10))) {
                                invalid = true;
                            }
                        }
                    }
                    //check required fields are not empty or none
                    if (
                        $(elem).hasClass('required') &&
                            (elem.value === '' || elem.value === 'none')
                    ) {
                        missing = true;
                    }
                    return {'missing': missing, 'invalid': invalid};
                },


                /** Populate a select
                 * data = list of json objects containing all data or a list of strings which will be used as value and display
                 * select = HTML element to be populated
                 * value_key = a single key as a string to use as value attribute for option
                 * text_keys = a string, list of strings or object with numbered keys, to use as text of option,
                 *              falls through list until it finds one in the data or comma separates numbered fields if object
                 * selected_option_value = optional argument to say which of the options should be selected 
                 * add_select = a boolean as to wether to add 'select' with value 'none' to the head of the data list*/
                populate_select: function (data, select, value_key, text_keys, selected_option_value, add_select, reactivate) {
                    var options, i, j, template, mapping, text_key, inner_template, inner_template_list, option_text, inner_mapping;
                    if (typeof add_select === 'undefined' || add_select === true) {
                        options = '<option value="none">select</option>';                        
                    } else {
                    	options = '';
                    }
                    template = '<option value="{val}"{select}>{text}</option>';
                    for (i = 0; i < data.length; i += 1) {
                        //sort out fall through to a key which does exist if text_keys is an array
                        if ($.isArray(text_keys)) {
                            for (j = 0; j < text_keys.length; j += 1) {
                                if (data[i].hasOwnProperty(text_keys[j])) {
                                    text_key = text_keys[j];
                                    break;
                                }
                            }
                        } else {
                            text_key = text_keys;
                        }
                        //if text_key is an object map multiple keys to display in option
                        if (Object.prototype.toString.call(text_key) === '[object Object]') {
                            inner_template_list = [];
                            j = 1;
                            inner_mapping = {};
                            while (text_key.hasOwnProperty(j)) {
                                inner_template_list.push('{' + text_key[j] + '}');
                                inner_template = inner_template_list.join(', ');
                                inner_mapping[text_key[j]] = 'test';
                                inner_mapping[text_key[j]] = data[i][text_key[j]] || 'none';
                                j += 1;
                            }
                            option_text = U.TEMPLATE.substitute(inner_template, inner_mapping);
                        }
                        //final mapping object for option
                        mapping = {val: data[i][value_key] || data[i], text: option_text || data[i][text_key] || data[i] || ' ', select: ""};
                        if (typeof selected_option_value !== 'undefined' && (data[i][value_key] === selected_option_value || data[i] === selected_option_value || data[i] === String(selected_option_value))) {
                            mapping.select = ' selected="selected"';
                        }
                        options += U.TEMPLATE.substitute(template, mapping);
                    }
                    select.innerHTML = options;
                    if (reactivate === true) {
                    	select.disabled = false;
                    }
                },

                get_value: function (elem) {
                    var value;
                    value = null;
                    if ((elem.tagName === 'INPUT' && (elem.type !== 'checkbox' && elem.type !== 'radio')) || elem.tagName === 'TEXTAREA') {
                        if (elem.value !== '' && typeof elem.value !== 'undefined' && elem.value !== null ) {
                            value = elem.value;
                            if ($(elem).hasClass('stringify')) {
                        	value = JSON.parse(value);
                            } else if ($(elem).hasClass('stringlist')) {
                                value = value.split('|');
                            } else if ($(elem).hasClass('integer')) {
                                    value = parseInt(value, 10);
                            } else if ($(elem).hasClass('datetime')) {
                                    value = {'$date': parseInt(value)};
                            } else if ($(elem).hasClass('boolean')) {
                            	//TODO: user value.toLowerCase() but for some reason
                            	//despite value being a string it gives typeerrors at the mo.
                        	if (value === 'true') {
                            		value = true;
                            	}
                            	if (value === 'false') {
                            		value = false;
                            	}             	
                            }
                        }
                    } else {
                        if (elem.type === 'checkbox') {
                            if ($(elem).hasClass('boolean')) {
                                if (elem.checked) {
                                    value = true;
                                } else {
                                    value = null;
                                }
                            } else {
                                if (elem.checked) {
                                    value = elem.value;
                                }
                            }
                        } else {
                            if (elem.tagName === 'SELECT') {
                                value = elem.value;
                                if (value !== 'none') {
                                    if ($(elem).hasClass('integer')) {
                                        value = parseInt(value, 10);
                                    } else {
                                        if ($(elem).hasClass('boolean')) {
                                            if (value === 'true') {
                                                value = true;
                                            } else {
                                                if (value === 'false') {
                                                    value = false;
                                                }
                                            }
                                        }
                                    }
                                } else {
                                    value = null;
                                }
                            } else {
                                if (elem.type === 'radio') {
                                    if (elem.checked  === true) {
                                        value = elem.value;
                                    }
                                }     
                            }
                        } 
                    }
                    return value;
                },

                /**TODO: make sure you catch errors with parseInt and leave
                   the string as it is - forms should be validating entry
                   anyway before this point! */
                serialize_form: function (form_id, elem_list, prefix) {
                    var i, j, k, elems, json, elem, value, subelems, key, subjson;
                    if (elem_list === undefined) {
                        elems = document.getElementById(form_id).elements;
                    } else {
                        elems = elem_list;
                    }
                    json = {};
                    for (i = 0; i < elems.length; i += 1) {
                        elem = elems[i];
                        value = null;
                        if (elem.disabled === false){     
                            if (elem.name ||  $(elem).hasClass('data_group')) {
                                if ($(elem).hasClass('data_group')) {
                                    /** construct a list of all elements
                                        descending from elem */
                                    subelems = [];
                                    j = i + 1;
                                    while (U.ELEMENT.is_ancestor(elems[j], elem)) {
                                        subelems.push(elems[j]);
                                        j += 1;
                                    }
                                    if (prefix === undefined) {
                                        key = elem.id;
                                    } else {
                                        key = elem.id.replace(prefix, '');
                                    }
                                    subjson = U.FORMS.serialize_form(form_id, subelems, elem.id + '_');
                                    if (!$.isEmptyObject(subjson)) {
                                        if ($(elem).hasClass('objectlist')) {
                                            try {
                                                json[key.substring(0, key.lastIndexOf('_'))].push(subjson);
                                            } catch (err) {
                                                json[key.substring(0, key.lastIndexOf('_'))] = [subjson];
                                            }
                                        } else if ($(elem).hasClass('stringlist')) {
                                            json[key] = [];
                                            for (k in subjson) {
                                                if (subjson.hasOwnProperty(k)) {
                                                    json[key].push(subjson[k]);
                                                }
                                            }
                                        } else {
                                            json[key] = subjson;
                                        }
                                    }
                                    i = j - 1;
                                } else {
                                    value = U.FORMS.get_value(elem);
                                    if (value !== null) {
                                        if (prefix === undefined) {
                                            json[elem.name] = value;
                                        } else {
                                            json[elem.name.replace(prefix, '')] = value;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    return json;
                },

                /** populates the provided field with the provided data */
                populate_field: function (field, data) {
                    var i;
                    if ((field.tagName === 'INPUT' &&
                    	field.type !== 'checkbox') ||
                            field.tagName === 'TEXTAREA') {
                        if ($.isArray(data)) {
                            field.value = data.join('|');
                        } else if (Object.prototype.toString.call(data) === '[object Object]') {
                        	field.value = JSON.stringify(data);
                        } else {
                            field.value = data;
                        }
                    } else if (field.type === 'checkbox') {
                        field.checked = data;
                    } else if (field.tagName === 'SELECT') {
                        if (Object.prototype.toString.call(data) === '[object Number]') {
                            data = data.toString();
                        }
                        if (field.options.length > 0) {
                            for (i = 0; i < field.options.length; i += 1) {
                                if (field.options[i].value === data) {
                                    field.options[i].selected = true;
                                }
                            }
                        }
                    }
                    return;
                },

                /** Populate a simple form from a JSON object
                    A simple form is defined as one which has all
                    fields visible at all times
                    perhaps better called static?
                    requires id on elements to be the same as the
                    corresponding JSON key
                    Embedded objects should have all keys in their
                    ancestor tree joined with '_'
                    inputs:
                    data: the JSON object
                    form: the form object to populate
                    prefix: used internally for dealing with embedded data*/
                populate_simple_form: function (data, form, prefix) {
                    var field, key, i;
                    if (prefix === undefined) {
                        prefix = '';
                    }
                    for (key in data) {
                        if (data.hasOwnProperty(key)) {
                            if (Object.prototype.toString.call(data[key]) === '[object Object]') {
                            	//then we might have a subobject or we might just need to stringify and store we can only tell from the class on the form item
                            	field = document.getElementById(prefix + key);
                            	if (field && $(field).hasClass('stringify')) {
                            	    U.FORMS.populate_field(field, data[key]);
                            	} else {
                            	   U.FORMS.populate_simple_form(data[key], form, prefix + key + '_');
                            	}
                            } else if ($.isArray(data[key]) &&
                                       Object.prototype.toString.call(data[key][0]) === '[object Object]') {
                                U.FORMS.populate_simple_form(data[key], form, prefix + key + '_');
                            } else if ($.isArray(data[key]) && //check if this is a multi field list rather than one that needs to be joined into a single pipe separated value
                            		document.getElementById(prefix + key + '_0')) {
                            	for (i = 0; i < data[key].length; i += 1) {
                            		field = document.getElementById(prefix + key + '_' + i);
                            		if (field) {
                                        U.FORMS.populate_field(field, data[key][i]);
                                    }
                            	}
                            } else {
                                field = document.getElementById(prefix + key);
                                if (field) {
                                    U.FORMS.populate_field(field, data[key]);
                                }
                            }
                        }
                    }
                },

                /** Populate a HTML form from a JSON object
                    complex is defined as a form which alows users to
                    manipulate the fields on display (adding extra rows etc.)
                    this function will attempt to use the add functions to
                    add the fields required to represent the JSON
                    NB if adding fields fails data will be lost so this must be
                    tested well for each form it is used for
                    and the form structure and javascript function names
                    manipulated as necessary to acheive desired behaviour
                    requires id on elements to be the same as the corresponding
                    JSON key
                    Embedded objects should have all keys in their ancestor tree
                    joined with '_'
                    the function for adding new fields should be 'add_' plus the
                    name of the fieldset being added minus the number count
                    inputs:
                    data: the JSON object
                    form: the form object to populate
                    js_namespace: the namespace string in which the
                    functions for
                    adding extra fields live (all must be in the same one)
                    prefix_list: used internally for dealing with embedded
                    data*/
                populate_complex_form: function (data, form, js_name_space, prefix_list) {
                    //assumes ids are the same as json key
                    var field, key, i, fnstring;
                    if (prefix_list === undefined) {
                        prefix_list = [];
                    }
                    for (key in data) {
                        if (data.hasOwnProperty(key)) {
                            if (Object.prototype.toString.call(data[key]) === '[object Object]') {
                        	//then we might have a subobject or we might just need to stringify and store we can only tell from the class on the form item
                        	if (prefix_list.length > 0) {
                        	    field = document.getElementById(prefix_list.join('_') + '_' + key);
                        	} else {
                        	    field = document.getElementById(key);
                        	}
                            	if (field && $(field).hasClass('stringify')) {
                            	    U.FORMS.populate_field(field, data[key]);
                            	} else {
                            	    prefix_list.push(key);
                            	    U.FORMS.populate_complex_form(data[key], form, js_name_space, prefix_list);
                            	}
                                
                                //objectlist
                            } else if ($.isArray(data[key]) && Object.prototype.toString.call(data[key][0]) === '[object Object]') {
                                prefix_list.push(key);
                                U.FORMS.populate_complex_form(data[key], form, js_name_space, prefix_list);
                            } else {
                                if (prefix_list.length > 0) {
                                    field = document.getElementById(prefix_list.join('_') +  '_' +  key);
                                } else {
                                    field = document.getElementById(key);
                                }
                                if (field) {
                                    U.FORMS.populate_field(field, data[key]);
                                } else {
                                    i = 1;
                                    while (field === null && i <= prefix_list.length) {
                                        fnstring = js_name_space + '.add_' + prefix_list.slice(0, i * -1).join('_');
                                        try {
                                            U.FUNCTOOLS.get_function_from_string(fnstring)(data);
                                            field = document.getElementById(prefix_list.join('_') + '_' + key);
                                            U.FORMS.populate_field(field, data[key]);
                                        } catch (err) {
                                            //ignore
                                        }
                                        i += 1;
                                    }
                                }
                            }
                        }
                    }
                    if (prefix_list.length > 0) {
                        prefix_list.pop();
                    }
                    return;
                },


                /** Options
                    next:
                    success: callback function called on success.
                 */
//                submit: function (form_id, options) {
//                    var validation;
//                    validation = U.FORMS.validate_form(form_id);
//                    if (validation.result === true) {
//                        U.FORMS.save(form_id, options);
//                    } else {
//                        MAG.DISPLAY.show_validation(validation);
//                        U.FORMS.show_error_box('<br/>The data is not valid and cannot be saved. Please fix the errors and resave.'
//                                                   + '<br/><br/>Red label text indicates that required data has not been supplied.'
//                                                   + '<br/>A red background indicates that the data in that box is not in a format that is valid.');
//                    }
//                    return;
//                },

                save: function (form_id, options) {
                    if (typeof options == "undefined") {
                        options = {};
                    }
                    options.json = U.FORMS.serialize_form(form_id);
                    options.model = options.json._model
                    if (options.json.hasOwnProperty('_id')) {
                        options.type = 'update';
                    } else {
                        options.type = 'create';
                    }
                    return U.FORMS.save_resource(form_id, options);
                },

//                save_resource: function (form_id, options) {
//                    var newoptions, item;
//                    newoptions = {'success': function(response) {
//                        for (item in localStorage) {
//                            if (item.indexOf('/api/' + form_id.replace('_form', '')) !== -1) {
//                            	localStorage.removeItem(item);
//                            	//this is no longer supported in FF. Replaced by line above
//                            	//delete localStorage[item];
//                            }
//                        }
//                        if (typeof options.success != "undefined") {
//                            options.success(response, options);
//                        } else {
//                            U.FORMS.reloader(response, options);
//                        }
//                    }, 'error': function(response) {
//                        U.FORMS.handle_error('create', response, options.json._model);
//                    }};
//                    if (options.type === 'create') {
//                        MAG.REST.create_resource(options.json._model, options.json, newoptions);
//                    } else if (options.type === 'update') {
//                        MAG.REST.update_resource(options.json._model, options.json, newoptions);
//                    }
//                },

                reloader: function(response, options) {
                    if (options.next === undefined) {
                        window.location.search = response._model + '=' + response._id;
                    } else {
                        window.location = options.next;
                    }
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
                    $('#error_close').on('click', function(event){
                        document.getElementsByTagName('body')[0].removeChild(document.getElementById('error'));
                    });
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
                    U.FORMS.show_error_box(report);
                }
                // End of submodule FORMS
            };
        }()),
        
        FUNCTOOLS: (function () {
            return {
                /** like $try */
                /** Tries to execute a number of functions.
                    Returns immediately the return value of the first
                    non-failed function without executing successive
                    functions, or null. **/
                attempt: function () {
                    var i, l;
                    for (i = 0, l = arguments.length; i < l; i += 1) {
                        try {
                            return arguments[i]();
                        } catch (e) {}
                    }
                    return null;
                },

                /** Turn a string into a function, like getattr in Python */
                get_function_from_string: function (fnname) {
                    var i, parts, lgth, fnref;
                    parts = fnname.split('.');
                    lgth = parts.length;
                    if (lgth === 1) {
                        return window[fnname];
                    }
                    fnref = window;
                    for (i = 0; i < lgth; i += 1) {
                        fnref = fnref[parts[i]];
                    }
                    return fnref;
                },

                // End of submodule FUNCTOOLS
            };
        }()),
        
        TEMPLATE: (function () {
            return {
        
                /** Performs a template substitution, returning a new string.
                    mapping is an object with keys that match the placeholders
                    in the template. */
                substitute: function (template, mapping) {
                    return template.replace(
                        (/\\?\{([A-Za-z0-9_\-]+)\}/g),
                        function (match, name) {
                            //return template.replace((/\\?\{([^{}]+)\}/g),
                            //function (match, name) {
                            if (match.charAt(0) === '\\') {
                                return match.slice(1);
                            }
                            return (
                                mapping[name] !== null
                            ) ? mapping[name] : '';
                        }
                    );
                },
        
                /** Removes leading and trailing white space from string and
                 * reduces multiple white space internally to a single space*/
                trim: function (s) {
                    s = s.replace(/(^\s*)|(\s*$)/gi, "");
                    s = s.replace(/[ ]{2,}/gi, " ");
                    s = s.replace(/\n /, "\n");
                    return s;
                },
        
                /** Replace all instances of `old_key` in `string` with `new_key` */
                replace_all: function(string, old_key, new_key) {
                    var regex = new RegExp(old_key, 'g');
                    return string.replace(regex, new_key);
                },
                // End of submodule TEMPLATE
            };
        }()),
        
        /** Functions for Elements and Nodes  */
        ELEMENT: (function () {
            return {

                /** Checks it testnode is an ancestor of node (HTML tree) */
                is_ancestor: function (node, testnode) {
                    while (node && node.parentNode) {
                        if (node.parentNode === testnode) {
                            return true;
                        }
                        node = node.parentNode;
                    }
                    return false;
                },
    
                insertAfter: function (newElement,targetElement) {
                    var parent = targetElement.parentNode;
                    if(parent.lastchild == targetElement) {
                        parent.appendChild(newElement);
                    }
                    else {
                        parent.insertBefore(newElement, targetElement.nextSibling);
                    }
                }
    
                // End of submodule ELEMENT
            };
        }()),
    };
}());
    