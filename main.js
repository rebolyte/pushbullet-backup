(function () {
	'use strict';

	var $ = document.querySelector.bind(document);
	var $$ = document.querySelectorAll.bind(document);
	Node.prototype.on = Node.prototype.addEventListener;

	function ready(fn) {
		if (document.readyState !== 'loading'){
			fn();
		} else {
			document.addEventListener('DOMContentLoaded', fn);
		}
	}

	// http://stackoverflow.com/a/23522755/2486583
	var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
	var downloadAttrSupported = ('download' in document.createElement('a'));

	var API_URL = 'https://api.pushbullet.com/v2';

	var BASE_PARAMS = {
		limit: 500, // default
		active: true // don't include deleted pushes
	};

	var pushesArr = [];

	function getPushes(params, token) {
		var n = 0;
		pushesArr = [];
		return new Promise(function (resolve, reject) {
			var recurse = function (params) {
				axios.get(API_URL + '/pushes', {
					headers: {
						'Access-Token': token
					},
					params: params
				})
				.then(function (resp) {
					pushesArr = pushesArr.concat(resp.data.pushes);
					n++;
					$('#requestNumContainer').innerHTML = n + ' requests made';
					// for debugging: (n < 2) && 
					if (typeof resp.data.cursor !== 'undefined') {
						return recurse(Object.assign({}, BASE_PARAMS, { cursor: resp.data.cursor }));
					} else {
						resolve(pushesArr.reverse());
					}
				})
				.catch(function (err) {
					reject(err);
				});
			};
			recurse(params);
		});
	}

	// http://stackoverflow.com/a/20812731
	// http://stackoverflow.com/a/20796276
	function createDownloadLink(containerNode, fileData, fileName){
		var anchorNode = document.createElement('a');
		// If we are replacing a previously generated file we need to
		// manually revoke the object URL to avoid memory leaks.
		if (window.downloadWebpageBlobObj) {
			window.URL.revokeObjectURL(window.downloadWebpageBlobObj);
		}
		window.downloadWebpageBlobObj = new Blob([fileData], { type: 'text/plain' });
		if (window.navigator.msSaveOrOpenBlob) {
			anchorNode.href = '#';
			anchorNode.on('click', function () {
				window.navigator.msSaveOrOpenBlob(downloadWebpageBlobObj, fileName);
			});
		} else {
			anchorNode.download = fileName;
			anchorNode.href = window.URL.createObjectURL(downloadWebpageBlobObj);
		}
		anchorNode.innerText = 'Download';
		containerNode.appendChild(anchorNode)
	}

	function validateForm(formNode) {
		var formValid = true;
		var textFlds = formNode.querySelectorAll('input[type="text"],input[type="email"],input[type="password"],textarea');
		var dropdowns = formNode.querySelectorAll('select');
		var checks = formNode.querySelectorAll('input[type="checkbox"]');
		var anyChecked = false;
		var radios = formNode.querySelectorAll('input[type="radio"]');
		var anyRadios = false;
		for (var i = 0, l = textFlds.length; i < l; i++) {
			if (!textFlds[i].value) {
				textFlds[i].focus();
				alert('Please enter text into the ' + textFlds[i].name + ' field.');
				formValid = false
				break;
			}
		}

		for (var i = 0, l = dropdowns.length; i < l; i++) {
			if (formValid && !dropdowns[i].value) {
				dropdowns[i].focus();
				alert('Please choose an option from the ' + dropdowns[i].name + ' selector.');
				formValid = false
				break;
			}
		}

		for (var i = 0, l = checks.length; i < l; i++) {
			if (checks[i].checked) {
				anyChecked = true;
				break;
			}
		}
		if (formValid && (checks.length > 0) && !anyChecked) {
			alert('Please choose at least one of the checkboxes.');
			formValid = false;
		}

		for (var i = 0, l = radios.length; i < l; i++) {
			if (radios[i].checked) {
				anyRadios = true;
				break;
			}
		}
		if (formValid && (radios.length > 0) && !anyRadios) {
			alert('Please check a radio button.');
			formValid = false;
		}

		return formValid;
	}

	function showDownloadLink(contents, ext) {
		var linkContainer = document.getElementById('downloadLinkContainer');

		linkContainer.innerHTML = '';
		createDownloadLink(linkContainer, contents, 'pushbullet-bak' + ext);

		if (isSafari && !downloadAttrSupported) {
			alert('You appear to be using an older version of Safari. Please right-click the download link and select "Save As..." to download your file.');
		}
	}

	function getHtmlFile(pushes) {
		axios.get('template.html')
		.then(function (resp) {
			var pageTemplate = resp.data;
			var templateFn = doT.template(pageTemplate);
			var result = templateFn({ pushes: pushes });

			showDownloadLink(result, '.html');
		})
		.catch(function (err) {
			console.error(err);
		});
	}

	function getJsonFile(pushes) {
		showDownloadLink(JSON.stringify(pushes, null, 4), '.json');
	}

	function getCsvFile(pushes) {
		var csv = new CSV(pushes, { header: true }).encode();
		showDownloadLink(csv, '.csv');
	}

	function init() {

		$('#theForm').on('submit', function (evt) {
			evt.preventDefault();

			$('#submitBtn').disabled = true;

			// TODO: Process dates from Unix epoch to ISO
			if (validateForm(this)) {
				getPushes(BASE_PARAMS, $('#theForm').apiToken.value).then(function (pushes) {
					console.log('all done');
					switch ($('#theForm').outputFormat.value) {
						case 'html':
							getHtmlFile(pushes);
							break;
						case 'json':
							getJsonFile(pushes);
							break;
						case 'csv':
							getCsvFile(pushes);
							break;
						default:
							throw new Error('Somehow we got a weird thing');
							break;
					}
					$('#submitBtn').disabled = false;
				}).catch(function (err) {
					alert('Oops, there was an error.');
					console.error(err);
					$('#submitBtn').disabled = false;
				});
			};
		});


	}

	ready(init)

}());
