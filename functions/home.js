import {MDCList} from '@material/list';
import {MDCDialog} from '@material/dialog';
import {MDCTextField} from '@material/textfield';
import {MDCRipple} from '@material/ripple';
import $ from "jquery";
import dt from 'datatables.net';
import buttons from 'datatables.net-buttons';
import print from 'datatables.net-buttons/js/buttons.print.min.js';
import {MDCTabBar} from '@material/tab-bar';
import {MDCSnackbar} from '@material/snackbar';
import {MDCSwitch} from '@material/switch';
import swal from 'sweetalert';
import mdcAutoInit from '@material/auto-init';
import {MDCSelect} from '@material/select';
import Chart from 'chart.js';
import {MDCChipSet} from '@material/chips';
import mdc from 'material-components-web';
import {MDCIconButtonToggle} from '@material/icon-button';
import dateFormat from 'dateformat';
import {MDCTopAppBar} from '@material/top-app-bar';
import {MDCDrawer} from "@material/drawer";

new MDCList(document.querySelector('.mdc-list'));
new MDCRipple(document.querySelector('#submit-user'));
new MDCRipple(document.querySelector('#add-product'));
new MDCRipple(document.querySelector('#add-category'));
new MDCRipple(document.querySelector('.button-delete-image'));
new MDCRipple(document.querySelector('#add-sub-category'));

const drawer = MDCDrawer.attachTo(document.querySelector('.mdc-drawer'));
const topAppBarElement = document.querySelector('.mdc-top-app-bar');
const topAppBar = new MDCTopAppBar(topAppBarElement);

topAppBar.setScrollTarget(document.getElementById('main-content'));
topAppBar.listen('MDCTopAppBar:nav', () => {
	drawer.open = !drawer.open;
});

const selector = '.mdc-button, .mdc-icon-button, .mdc-card__primary-action';
const ripples = [].map.call(document.querySelectorAll(selector), function(el) {
  return new MDCRipple(el);
});

const dialog_logout = new MDCDialog(document.querySelector('.dialog-logout'));
const dialog_products = new MDCDialog(document.querySelector('.dialog-products'));
const dialog_add_category = new MDCDialog(document.querySelector('.dialog-add-category'));
const dialog_add_product = new MDCDialog(document.querySelector('.dialog-add-product'));
const dialog_cart = new MDCDialog(document.querySelector('.dialog-cart'));
const dialog_price = new MDCDialog(document.querySelector('.dialog-price'));
const dialog_information = new MDCDialog(document.querySelector('.dialog-information'));
const dialog_sub_category = new MDCDialog(document.querySelector('.dialog-sub-category'));
const dialog_restock = new MDCDialog(document.querySelector('.dialog-restock'));
const dialog_sold = new MDCDialog(document.querySelector('.dialog-sold'));
const dialog_write_sub = new MDCDialog(document.querySelector('.dialog-write-sub'));

const tabBar = new MDCTabBar(document.querySelector('.mdc-tab-bar'));
const snackbar = new MDCSnackbar(document.querySelector('.snackbar-no-product'));
const snackbar_upload = new MDCSnackbar(document.querySelector('.snackbar-upload'));
const snackbar_undo = new MDCSnackbar(document.querySelector('.snackbar-undo'));
const snackbar_subcategory = new MDCSnackbar(document.querySelector('.snackbar-subcategory'));
const switchControl = new MDCSwitch(document.querySelector('.switch-product'));
const switchUser = new MDCSwitch(document.querySelector('.switch-user'));
const fabRipple = new MDCRipple(document.querySelector('.mdc-fab'));
const select_category = new MDCSelect(document.querySelector('.select-category'));
const select_type = new MDCSelect(document.querySelector('.select-type'));
const select_year = new MDCSelect(document.querySelector('.select-year'));
const switchCDaily = new MDCSwitch(document.querySelector('.switch-daily'));
const select_month = new MDCSelect(document.querySelector('.select-month'));

const chipSetEl = document.querySelector('#chip-category');
const chipSet = new MDCChipSet(chipSetEl);

const chipSetEl2 = document.querySelector('#chip-inventory');
const chipSet2 = new MDCChipSet(chipSetEl2);

const chipSetEl3 = document.querySelector('#chip-product');
const chipSet3 = new MDCChipSet(chipSetEl3);

const chipSetEl4 = document.querySelector('#chip-sizes');
var chipSet4 = new MDCChipSet(chipSetEl4);

const textFieldElements = [].slice.call(document.querySelectorAll('.mdc-text-field'));
textFieldElements.forEach((textFieldEl) => {
  new MDCTextField(textFieldEl);
});

const productElavation = 'mdc-elevation--z4';
const category_placeholder = 'assets/category_placeholder.png';
const no_image = 'assets/no_image.jpg';

var category_image = null;
var product_image = null;
var transactions = 0;
const zero_threshold = 0;
const warning_threshold = 10;

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const week1 = 'week1';
const week2 = 'week2';
const week3 = 'week3';
const week4 = 'week4';
const week5 = 'week5';

$(document).ready(() => {

	try {
		let app = firebase.app();
		let features = ['auth', 'database', 'messaging', 'storage'].filter(feature => typeof app[feature] === 'function');
		console.log(`Firebase SDK loaded with ${features.join(', ')}`);
	} catch (e) {
		console.error(e);
		console.log('Error loading the Firebase SDK, check the console.');
	 	setTimeout(() => {
	 		window.location.reload();
	 	}, 500);
	}

	const auth = firebase.auth();
	const db = firebase.firestore();
	const functions = firebase.functions();
	const storage = firebase.storage();
	const messaging = firebase.messaging();

	// Firestore collections
	const categories = db.collection('categories');
	const products = db.collection('products');
	const measurements = db.collection('measurements');
	const notifications = db.collection('notifications');
	const sales_orders = db.collection('sales_orders');
	const tally = db.collection('tally');
	// Cloud Functions
	const insertNewUser = functions.httpsCallable("insertNewUser");
	const getUserRecord = functions.httpsCallable("getUserRecord");
	// Storage Ref
	const categoryImages = storage.ref().child('category');
	const productImages = storage.ref().child('product');
	// Auth
	var uid;
	var displayName;
	var userType;

	const getOptions = {
		source: 'cache'
	};

	var cart = {};

	var reorder_table, outstock_table, indemand_table, unsellable_table;

	function resetInput(form) {
		$(form).trigger('reset');
		$('.mdc-text-field').find('div:first').removeClass('mdc-notched-outline--notched');
		$('.mdc-text-field').removeClass('mdc-text-field--invalid');
		$('.mdc-floating-label').removeClass('mdc-floating-label--float-above');
		$('.mdc-notched-outline__notch').removeAttr("style");
		category_image = null;
		product_image = null;
	}

	function categoryView(category) {
		/*const categoryList = '\
			<li class="mdc-image-list__item mdc-elevation-transition" name="'+category.name+'" id="category-'+category.id+'">\
			  <img class="mdc-image-list__image" src="'+(category.image === undefined ? category_placeholder : category.image)+'">\
			  <div class="mdc-image-list__supporting">\
			    <span class="mdc-image-list__label mdc-typography--body1">'+ category.name +'</span>\
			  </div>\
			</li>\
		';*/
		const categoryList = '\
			<li class="mdc-list-item mdc-image-list__item mdc-elevation-transition" tabindex="-1" name="'+category.name+'" id="category-'+category.id+'">\
			    <span class="mdc-list-item__text">'+ category.name +'</span>\
		    </li>\
		';
		getTotalProducts(category.id, category.name);
		return categoryList;
	}

	function getTotalProducts(categoryId, name) {
		products.where("category.id", "==", categoryId).get(getOptions)
			.then(querySnapshot => {
				const total_products = querySnapshot.size;
				$('#category-' + categoryId).children().eq(1).children().eq(0).text(name + " (" + total_products + ")");
				return null;
			})
			.catch(err => console.log(err));
	}

	function assignValue(textFieldClass, value) {
		if (document.querySelector(textFieldClass) === undefined || document.querySelector(textFieldClass) === null) return;
		new MDCTextField(document.querySelector(textFieldClass)).value = value || '';
	}

	function setStock(stock, threshold) {
		var color = '';
		if (stock <= zero_threshold) {
			color = 'red';
		}else if (stock <= threshold) {
			color = '#ffae42';
		}else {
			color = 'black';
		}
		const stock_p = '<p style="color:'+color+';"><strong>'+stock+'</strong></p>';
		return stock_p;
	}

	function getProduct(id) {
		products.doc(id).get(getOptions)
			.then(doc => {
				const product = doc.data();
				return product.name;
			})
			.catch(err => console.log(err.message));
	}

	function timeSince(date) {

	  var seconds = Math.floor((new Date() - date) / 1000);

	  var interval = Math.floor(seconds / 31536000);

	  if (interval > 1) {
	    return interval + " years ago";
	  }
	  interval = Math.floor(seconds / 2592000);
	  if (interval > 1) {
	    return interval + " months ago";
	  }
	  interval = Math.floor(seconds / 86400);
	  if (interval > 1) {
	    return interval + " days ago";
	  }
	  interval = Math.floor(seconds / 3600);
	  if (interval > 1) {
	    return interval + " hours ago";
	  }
	  interval = Math.floor(seconds / 60);
	  if (interval > 1) {
	    return interval + " minutes ago";
	  }
	  return Math.floor(seconds) + " seconds ago";
	}

	function randomBackgroundColor(length) {
		var colors = [];
		for (var i = 0; i < length; i++) {
			const color = '#'+(Math.random()*0xFFFFFF<<0).toString(16);
			colors.push(color);
		}
		return colors;
	}

	function dashboard() {

		const most_purchased_table = $('#table-most-purchased').DataTable({
			"pagingType": "simple"
		});

		products
			.orderBy('sold', 'desc')
			.limit(10)
			.onSnapshot(querySnapshot => {
				most_purchased_table.clear().draw();
				querySnapshot.forEach(doc => {
					const product = doc.data();
					var hehehe = '';
					if (product.size !== undefined && product.size !== null && product.size.length !== null && product.size.length !== undefined && product.size.length > 0) {
						for (var i = 0; i < product.size.length; i++) {
							hehehe += '<i>' + product.size[parseInt(i)] + '</i>';
							if (i !== product.size.length - 1) {
								hehehe += " ,";
							}
						}
					}
					const dataset = [product.name, hehehe, product.sold, product.stock, product.threshold];
					most_purchased_table.rows.add([dataset]).draw().nodes().to$().addClass('most_' + doc.id);
				});
			});

		months.forEach(month => {
			$('#list-month-container').append('<li class="mdc-list-item '+(month === 'September'? "mdc-list-item--selected" : "")+'" data-value="'+String(months.indexOf(month) + 1)+'" role="option">'+month+'</li>');
		});
		$('#month-selected-text').text('September');

		const categoryPie = new Chart($('#categoryChart'), {
			type: 'doughnut',
			data: {
				datasets: [{
					data: [
						0
					]
				}],
				labels: [
					'--'
				]
			},
			options: {
				responsive: true,
				animation: {
					animateRotate: true
				},
				title: {
					text: 'Product category',
					display: false
				}
			}
		});

		const lowStockBar = new Chart($('#lowStockChart'), {
		  type: 'bar',
		  data: {
		    labels: [],
		    datasets: [{
		      label: 'No Low Stock',
		      data: [],
		      backgroundColor: [],
		      borderColor: [],
		      borderWidth: 1
		    }]
		  },
		  options: {
		  	title: {
		  		text: '',
		  		display: false
		  	},
		    responsive: true,
		    scales: {
		      xAxes: [{
		        ticks: {
		          maxRotation: 90,
		          minRotation: 80
		        },
		        scaleLabel: {
	                display: true,
	                labelString: 'Product'
	              }
		      }],
		      yAxes: [{
		        ticks: {
		          beginAtZero: true
		        },
		        scaleLabel: {
	                display: true,
	                labelString: 'Stock'
	              }
		      }]
		    }
		  }
		});

		const salesChart = new Chart($('#chartJSContainer'), {
			  type: 'line',
			  data: {
			    labels: [],
			    datasets: [
				    {
			      		label: '# of Items Sold',
			      		pointHoverBorderColor: "yellow",
			      		pointHoverBorderWidth: 2,
			      		pointHoverBackgroundColor: "brown",
			      		backgroundColor: randomBackgroundColor(1),
			      		borderColor: randomBackgroundColor(1),
			      		data: [],
	      				borderWidth: 1
			    	}
				]
			  },
			  options: {
			  	title: {
			  		text: '',
			  		display: true
			  	},
			  	scales: {
				      xAxes: [{
				        ticks: {
				          maxRotation: 90,
				          minRotation: 80
				        },
				        scaleLabel: {
			                display: true,
			                labelString: 'Interval'
			              }
				      }],
				      yAxes: [{
				        ticks: {
				          beginAtZero: true
				        },
				        scaleLabel: {
			                display: true,
			                labelString: 'Sales'
			              }
				      }]
				    }
			  }
		})

		
		products
			.onSnapshot(snapshot => {

				// Best Selling Product Yesterday
				// Best Selling Product Last Week

				const data = [];
				const labels = [];
				snapshot.forEach(doc => {
					if (doc.exists) {
						const product = doc.data();
						const threshold = product.threshold || 10;
						const stock = product.stock || 0;
						if (threshold > stock) {
							// Low stock
							data.push(stock);
							labels.push(product.name);
						}
					}
				});
				lowStockBar.data.labels = labels;
				lowStockBar.data.datasets[0].data = data;
				lowStockBar.data.datasets[0].backgroundColor = randomBackgroundColor(labels.length);
				lowStockBar.data.datasets[0].borderColor = randomBackgroundColor(labels.length);
				lowStockBar.data.datasets[0].label = ''
				lowStockBar.options.title.text = "Low Stock Product";
				lowStockBar.update();

				// Category Overview
				var category_names = {};
				categories.get()
					.then(snapshot => {
						const promises = [];
						for (var member in category_names) delete category_names[member]; // Clearing the array
						snapshot.forEach(doc => {
							const promise = products.where('category.id', '==', doc.id).get(getOptions);
							promises.push(promise);
							category_names[doc.id] = doc.data().name;
						});
						return Promise.all(promises);
					})
					.then(querySnapshots => {
						var data = [];
						var labels = [];
						querySnapshots.forEach(querySnapshot => {
							// Looping each category
							var total_products = 0;
							var category_name = '---';
							querySnapshot.forEach(doc => {
								// How many products are there in the category
								if (doc.exists) {
									total_products++;
									category_name = category_names[doc.data().category.id];
								}
							});
							data.push(total_products);
							labels.push(category_name);
						});
						categoryPie.data.labels = labels;
						categoryPie.data.datasets[0].data = data;
						categoryPie.data.datasets[0].backgroundColor = randomBackgroundColor(labels.length);
						categoryPie.options.title.text = "Category Overview";
						return categoryPie.update();
					})
					.catch(err => console.log(err));
			});

		var yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);
		var dd = yesterday.getDate();
		var mm = yesterday.getMonth()+1; //As January is 0.
		var yyyy = yesterday.getFullYear();
		if(dd<10) dd='0'+dd;
		if(mm<10) mm='0'+mm;
		const yest_str = yyyy+'-'+mm+'-'+dd;

		products.get()
			.then(querySnapshot => {
				$('#lastweek-enough').hide();
				const docs = [];
				docs.push(querySnapshot.docs[6]);
				docs.push(querySnapshot.docs[1]);
				docs.forEach(doc => {
					const product = doc.data();
					const elem = '<div class="mdc-card demo-card demo-ui-control" style="height: 130px; width: 280px; margin: 4px; display: inline-block;">\
					              <div style="display: none;" class="mdc-card__primary-action demo-card__primary-action" tabindex="0">\
					                <div class="mdc-card__media mdc-card__media--square demo-card__media" style="background-image: url(&quot;'+(product.image || no_image)+'&quot;);"></div>\
					                <div class="demo-card__primary">\
					                </div>\
					              </div>\
					              <div class="mdc-card__actions">\
					                <div class="mdc-card__action-buttons">\
					                  <h2 class="demo-card__title mdc-typography mdc-typography--headline6">'+product.name+'</h2>\
					                </div>\
					                <div class="mdc-card__action-icons">\
					                  <button product="'+encodeURIComponent(JSON.stringify(product))+'" class="show_product mdc-icon-button material-icons mdc-card__action mdc-card__action--icon--unbounded" title="Share" data-mdc-ripple-is-unbounded="true">info_outline</button>\
					                  <button product-id="'+doc.id+'" class="resolve mdc-icon-button material-icons mdc-card__action mdc-card__action--icon--unbounded" title="More options" data-mdc-ripple-is-unbounded="true">add</button>\
					                </div>\
					              </div>\
					            </div>';
		            $('#lastweek-card-container').append(elem);
				});
				const selector = '.mdc-button, .mdc-icon-button, .mdc-card__primary-action';
				const ripples = [].map.call(document.querySelectorAll(selector), function(el) {
				  new MDCRipple(el);
				});
				return null;

			})
			.catch(err => console.log(err));

		tally.doc(yest_str).get()
			.then(doc => {
				if (doc.exists) {
					const productIdH = doc.data().bestSeller;
					const productIdL = doc.data().lowestSeller;
					const promises = [];
					promises.push(products.doc(productIdH).get());
					if (productIdH !== productIdL) {
						promises.push(products.doc(productIdL).get());
					}
					
					return Promise.all(promises)
						.then((docs) => {
							if (docs.length > 0) {
								$('#yesterday-enough').hide();
								docs.forEach(doc => {
									const product = doc.data();
									const elem = '<div class="mdc-card demo-card demo-ui-control" style="height: 130px; width: 280px; margin: 4px; display: inline-block;">\
									              <div style="display: none;" class="mdc-card__primary-action demo-card__primary-action" tabindex="0">\
									                <div class="mdc-card__media mdc-card__media--square demo-card__media" style="background-image: url(&quot;'+(product.image || no_image)+'&quot;);"></div>\
									                <div class="demo-card__primary">\
									                </div>\
									              </div>\
									              <div class="mdc-card__actions">\
									                <div class="mdc-card__action-buttons">\
									                  <h2 class="demo-card__title mdc-typography mdc-typography--headline6">'+product.name+'</h2>\
									                </div>\
									                <div class="mdc-card__action-icons">\
									                  <button product="'+encodeURIComponent(JSON.stringify(product))+'" class="show_product mdc-icon-button material-icons mdc-card__action mdc-card__action--icon--unbounded" title="Share" data-mdc-ripple-is-unbounded="true">info_outline</button>\
									                  <button product-id="'+doc.id+'" class="resolve mdc-icon-button material-icons mdc-card__action mdc-card__action--icon--unbounded" title="More options" data-mdc-ripple-is-unbounded="true">add</button>\
									                </div>\
									              </div>\
									            </div>';
						            $('#yesterday-card-container').append(elem);
								});
								const selector = '.mdc-button, .mdc-icon-button, .mdc-card__primary-action';
								const ripples = [].map.call(document.querySelectorAll(selector), function(el) {
								  new MDCRipple(el);
								});
								return null;
							}else {
								console.log('No tally yesterday')
								return null;
							}
						})
						.catch(err => console.log(err));
				}else {
					console.log('Tally for yesterday does not exist');
				}
				return null;
			})
			.catch(err => console.log(err));

		function mergeObj(obj1, obj2) {
			var less = obj1;
			var more = obj2;
			if (Object.keys(obj1) > Object.keys(obj2)) {
				more = obj1;
				less = obj2;
			}
			for (var productId in less) {
				more[productId] = parseInt(more[productId] || 0) + parseInt(less[productId]);
			}
			return more;
		}

		const summary_table = $('#summary-table').DataTable({
			searching: false, 
			info: false
		});

		function updateSalesChart(year, monthName, isDaily) {
			tally.get()
				.then(snapshots => {

					/*const year = '2019'; // Sample year
					const monthName = null;
					var isDaily = true;*/

					const month = String(months.indexOf(monthName) + 1).length === 1 ? '0' + String(months.indexOf(monthName) + 1) : String(months.indexOf(monthName) + 1); // Sample month
					
					const productss = [];
					const product_sales = [];
					const data = []; // sales
					const label = []; // interval
					var data_temp = {};
					var data_temp2 = {};

					var xTitle = '';
					var yTitle = '';

					var docId = year + '-';
					// Daily or weekly
					if (monthName !== null) {
						docId += month + '-';
					}
					snapshots.forEach(doc => {
						const date = doc.id;
						
						if ((doc.id).startsWith(docId)) {
							const total_sales = doc.data().total_sales;
							const sales = doc.data().sales;
							
							if (monthName !== null) {
								// Daily or weekly
								const day = String((doc.id).split('-')[2]);
								if (isDaily) {
									data.push(total_sales);
									label.push(day);
									productss.push(doc.data().bestSeller);
									product_sales.push(sales[doc.data().bestSeller]);
								}else {
									const int_day = parseInt(day);
									if (int_day > 28) {
										// 5th week
										data_temp[week5] = parseInt(data_temp[week5] || 0) + parseInt(total_sales);
										data_temp2[week5] = mergeObj((data_temp2[week5] || {}), sales);
									}else if (int_day > 21) {
										// 4th week
										data_temp[week4] = parseInt(data_temp[week4] || 0) + parseInt(total_sales);
										data_temp2[week4] = mergeObj((data_temp2[week4] || {}), sales);
									}else if (int_day > 14) {
										// 3rd week;
										data_temp[week3] = parseInt(data_temp[week3] || 0) + parseInt(total_sales);
										data_temp2[week3] = mergeObj((data_temp2[week3] || {}), sales);
									}else if (int_day > 7) {
										// 2nd week;
										data_temp[week2] = parseInt(data_temp[week2] || 0) + parseInt(total_sales);
										data_temp2[week2] = mergeObj((data_temp2[week2] || {}), sales);
									}else {
										// 1st week
										data_temp[week1] = parseInt(data_temp[week1] || 0) + parseInt(total_sales);
										data_temp2[week1] = mergeObj((data_temp2[week1] || {}), sales);
									}
								}
							}else {
								// Monthly
								const monthh = String((doc.id).split('-')[1]);
								data_temp[monthh] = parseInt(data_temp[monthh] || 0) + parseInt(total_sales);
								data_temp2[monthh] = mergeObj((data_temp2[monthh] || {}), sales);
							}
						}
					});

					if (monthName !== null) {
						if (!isDaily) {
							for (var week in data_temp) {
								label.push(week);
								data.push(data_temp[week]);

								const obj = data_temp2[week];
								const bestSellerProductId = Object.keys(obj).reduce(function(a, b){ return obj[a] > obj[b] ? a : b });
								productss.push(bestSellerProductId);
								product_sales.push(data_temp2[week][bestSellerProductId]);
							}
							xTitle = year + ' Weekly Items Sold for ' + monthName;
							yTitle = 'Weekly';
						}else {
							xTitle = year + ' Daily Items Sold for ' + monthName;
							yTitle = 'Daily';
						}
					}else {
						for (var monthh in data_temp) {
							label.push(months[parseInt(monthh) - 1]);
							data.push(data_temp[monthh]);
							const obj = data_temp2[monthh];
							const bestSellerProductId = Object.keys(obj).reduce(function(a, b){ return obj[a] > obj[b] ? a : b });
							productss.push(bestSellerProductId);
							product_sales.push(data_temp2[monthh][bestSellerProductId]);
							xTitle = 'Monthly sales for ' + year;
							yTitle = 'Monthly';
						}
					}

					salesChart.data.labels = label;
					salesChart.data.datasets[0].data = data;
					salesChart.options.scales.xAxes[0].scaleLabel.labelString = yTitle;
					salesChart.options.title.text = xTitle;

					summary_table.clear().draw();
					$('#label_hehe').text(yTitle);
					const promises = [];
					for (var i = 0; label.length > i; i++) {
						promises.push(products.doc(productss[i]).get());
					}
					Promise.all(promises)
						.then(docs => {
							docs.forEach(doc => {
								var name = "undefined";
								if (doc.exists) {
									const product = doc.data();
									name = product.name;
								}
								const i = productss.indexOf(doc.id);
								const dataset = [label[i], name, product_sales[i]];
								summary_table.rows.add([dataset]).draw().nodes().to$().addClass('summary_item_' + doc.id);
							});
							return null;
						})
						.catch(err => console.log(err));

					return salesChart.update();
				})
				.catch(err => console.log(err));
		}

		select_month.listen('MDCSelect:change', () => {
			if (select_month.value.trim() === "") {
				$('#daily_switch').fadeOut();
			}else {
				$('#daily_switch').fadeIn();
			}
			updateSalesChart(select_year.value, (months[parseInt(select_month.value) - 1] || null), !switchCDaily.checked);
		});
		select_year.listen('MDCSelect:change', () => {
			updateSalesChart(select_year.value, (months[parseInt(select_month.value) - 1] || null), !switchCDaily.checked);
		});
		$('.switch-daily').change(() => {
			updateSalesChart(select_year.value, (months[parseInt(select_month.value) - 1] || null), !switchCDaily.checked);
		});

		setTimeout(() => {
			updateSalesChart(select_year.value, (months[parseInt(select_month.value) - 1] || null), !switchCDaily.checked);
		}, 1500);

	}

	function notification() {
		
		reorder_table = $('#reorder-table').DataTable({
			searching: false, 
			info: false,
			"bSort" : false
		});
		outstock_table = $('#outstock-table').DataTable({
			searching: false, 
			info: false,
			"bSort" : false
		});
		indemand_table = $('#indemand-table').DataTable({
			searching: false, 
			info: false,
			"bSort" : false
		});
		unsellable_table = $('#unsellable-table').DataTable({
			searching: false, 
			info: false,
			"bSort" : false
		});

		notifications.where('type', '==', 'Re-stock').orderBy('timestamp', 'desc')
			.onSnapshot((snapshot) => {
				snapshot.docChanges().forEach((change) => {
					const notification = change.doc.data();
					const notificationId = change.doc.id;
					notification.id = notificationId;
					notification.timestamp = notification.timestamp.toDate();

					products.doc(notification.productId).get(getOptions)
						.then(doc => {
							if (doc.exists) {
								const type = '<strong>' + (notification.type || 'Re-stock') + '</strong>';
								var icon = '<i class="material-icons">style</i>';
								var button = '<button class="mdc-button mdc-button--outlined resolve resolve_'+notificationId+'" product-id="'+notification.productId+'">ADD STOCK</button>';
								
								if (!notification.resolved) {
									button = '<button style="background-color: #f1c40f;" class="mdc-button mdc-button--raised resolve resolve_'+notificationId+'" product-id="'+notification.productId+'">Resolve</button>';
									icon = '<i class="material-icons">new_releases</i>';
								}else {
									button = '<button class="mdc-button archive resolve_'+notificationId+'" notification="'+encodeURIComponent(JSON.stringify(notification))+'">Clear</button>';
									icon = '<i class="material-icons">done_outline</i>';
								}

								const resolveDate = notification.dateResolved !== undefined && notification.dateResolved !== null ? notification.dateResolved.toDate().toLocaleString() : '--';
								
								const dataset = [icon, type, doc.data().name, (notification.message || ''), timeSince(notification.timestamp), resolveDate, button];

								if (change.type === 'added') {
									reorder_table.rows.add([dataset]).draw().nodes().to$().addClass(notificationId);
								}
								if (change.type === 'modified') {
									reorder_table.row('.' + notificationId).data(dataset).draw();
								}
								if (change.type === 'removed') {
									reorder_table.row('.' + notificationId).remove().draw();
								}
								if ($('.resolve_' + notificationId).length > 0) {
									new MDCRipple(document.querySelector('.resolve_' + notificationId));
								}
							}
							return null;
						})
						.catch(err => console.log(err));
				});
			});

		notifications.where('type', '==', 'Unavailable').orderBy('timestamp', 'desc')
			.onSnapshot((snapshot) => {
				snapshot.docChanges().forEach((change) => {
					const notification = change.doc.data();
					const notificationId = change.doc.id;
					notification.id = notificationId;
					notification.timestamp = notification.timestamp.toDate();

					products.doc(notification.productId).get(getOptions)
						.then(doc => {
							if (doc.exists) {
								const type = '<strong>' + (notification.type || 'Re-stock') + '</strong>';
								var icon = '<i class="material-icons">style</i>';
								var button = '<button class="mdc-button mdc-button--outlined resolve resolve_'+notificationId+'" product-id="'+notification.productId+'">ADD STOCK</button>';
								
								if (!notification.resolved) {
									button = '<button style="background-color: #e74c3c;" class="mdc-button mdc-button--raised resolve resolve_'+notificationId+'" product-id="'+notification.productId+'">Resolve</button>';
									icon = '<i class="material-icons">new_releases</i>';
								}else {
									button = '<button class="mdc-button archive resolve_'+notificationId+'" notification="'+encodeURIComponent(JSON.stringify(notification))+'">Clear</button>';
									icon = '<i class="material-icons">done_outline</i>';
								}

								const resolveDate = notification.dateResolved !== undefined && notification.dateResolved !== null ? notification.dateResolved.toDate().toLocaleString() : '--';
								
								const dataset = [icon, type, doc.data().name, (notification.message || ''), timeSince(notification.timestamp), resolveDate, button];

								if (change.type === 'added') {
									outstock_table.rows.add([dataset]).draw().nodes().to$().addClass(notificationId);
								}
								if (change.type === 'modified') {
									outstock_table.row('.' + notificationId).data(dataset).draw();
								}
								if (change.type === 'removed') {
									outstock_table.row('.' + notificationId).remove().draw();
								}
								if ($('.resolve_' + notificationId).length > 0) {
									new MDCRipple(document.querySelector('.resolve_' + notificationId));
								}
							}
							return null;
						})
						.catch(err => console.log(err));
				});
			});

		notifications.where('type', '==', 'Recommendation').orderBy('timestamp', 'desc')
			.onSnapshot((snapshot) => {
				snapshot.docChanges().forEach((change) => {
					const notification = change.doc.data();
					const notificationId = change.doc.id;
					notification.id = notificationId;
					notification.timestamp = notification.timestamp.toDate();

					products.doc(notification.productId).get(getOptions)
						.then(doc => {
							if (doc.exists) {
								const type = '<strong>Indemand</strong>';
								var icon = '<i class="material-icons">style</i>';
								var button = '<button style="color: #3498db;" class="mdc-button mdc-button--outlined resolve resolve_'+notificationId+'" product-id="'+notification.productId+'">ADD STOCK</button>';
								
								if (!notification.resolved) {
									button = '<button style="color: #3498db;" class="mdc-button mdc-button--outlined resolve resolve_'+notificationId+'" product-id="'+notification.productId+'">ADD STOCK</button>';
									icon = '<i class="material-icons">style</i>';
								}else {
									button = '<button class="mdc-button archive resolve_'+notificationId+'" notification="'+encodeURIComponent(JSON.stringify(notification))+'">Clear</button>';
									icon = '<i class="material-icons">done_outline</i>';
								}

								const resolveDate = notification.dateResolved !== undefined && notification.dateResolved !== null ? notification.dateResolved.toDate().toLocaleString() : '--';
								
								const dataset = [icon, type, doc.data().name, (notification.message || ''), timeSince(notification.timestamp), resolveDate, button];

								if (change.type === 'added') {
									indemand_table.rows.add([dataset]).draw().nodes().to$().addClass(notificationId);
								}
								if (change.type === 'modified') {
									indemand_table.row('.' + notificationId).data(dataset).draw();
								}
								if (change.type === 'removed') {
									indemand_table.row('.' + notificationId).remove().draw();
								}
								if ($('.resolve_' + notificationId).length > 0) {
									new MDCRipple(document.querySelector('.resolve_' + notificationId));
								}
							}
							return null;
						})
						.catch(err => console.log(err));
				});
			});

		notifications.where('type', '==', 'Unsellable').orderBy('timestamp', 'desc')
			.onSnapshot((snapshot) => {
				snapshot.docChanges().forEach((change) => {
					const notification = change.doc.data();
					const notificationId = change.doc.id;
					notification.id = notificationId;
					notification.timestamp = notification.timestamp.toDate();

					products.doc(notification.productId).get(getOptions)
						.then(doc => {
							if (doc.exists) {
								const type = '<strong>' + (notification.type || 'Re-stock') + '</strong>';
								var icon = '<i class="material-icons">thumb_down</i>';
								var button = '<button style="color: #f39c12;" class="mdc-button mdc-button--outlined resolve resolve_'+notificationId+'" product-id="'+notification.productId+'">ADD STOCK</button>';
								
								if (!notification.resolved) {
									button = '<button style="color: #f39c12;" class="mdc-button mdc-button--outlined resolve resolve_'+notificationId+'" product-id="'+notification.productId+'">ADD STOCK</button>';
									icon = '<i class="material-icons">thumb_down</i>';
								}else {
									button = '<button class="mdc-button archive resolve_'+notificationId+'" notification="'+encodeURIComponent(JSON.stringify(notification))+'">Clear</button>';
									icon = '<i class="material-icons">done_outline</i>';
								}

								const resolveDate = notification.dateResolved !== undefined && notification.dateResolved !== null ? notification.dateResolved.toDate().toLocaleString() : '--';
								
								const dataset = [icon, type, doc.data().name, (notification.message || ''), timeSince(notification.timestamp), resolveDate, button];

								if (change.type === 'added') {
									unsellable_table.rows.add([dataset]).draw().nodes().to$().addClass(notificationId);
								}
								if (change.type === 'modified') {
									unsellable_table.row('.' + notificationId).data(dataset).draw();
								}
								if (change.type === 'removed') {
									unsellable_table.row('.' + notificationId).remove().draw();
								}
								if ($('.resolve_' + notificationId).length > 0) {
									new MDCRipple(document.querySelector('.resolve_' + notificationId));
								}
							}
							return null;
						})
						.catch(err => console.log(err));
				});
			});

		notifications
			.where('seen', '==', false)
			.onSnapshot((snapshot) => {
				if (snapshot.size > 0) {
					$('.nav-notification').text('Notification (' + snapshot.size + ')');
				}else {
					$('.nav-notification').text('Notification');
				}
			});

		$('body').on('click', '.resolve', (e) => {
			const productId = $(e.currentTarget).attr('product-id');
			products.doc(productId).get(getOptions)
				.then((doc) => {
					const product = doc.data();
					$('#notif-product-name').text(product.name);
					$('#remaining').text(product.stock || 0);
					$('#threshold').text(product.threshold || warning_threshold);
					$('#done-restock').attr('remaining', (product.stock || 0));
					$('#done-restock').attr('threshold', (product.threshold || warning_threshold));
					return null;
				})
				.catch(err => console.log(err));
			$('#input-restock').val('');
			dialog_restock.open();
			$('#done-restock').attr('product-id', productId);
		});

		$('body').on('click', '.archive', (e) => {
			const notification = JSON.parse(decodeURIComponent($(e.currentTarget).attr('notification')));
			notifications.doc(notification.id).delete();
			snackbar_undo.open();
			$('#snackbar-undo-action').attr('notification', encodeURIComponent(JSON.stringify(notification)));
		});

		$('#snackbar-undo-action').click((e) => {
			const notification = JSON.parse(decodeURIComponent($(e.currentTarget).attr('notification')));
			notification.timestamp = new Date(notification.timestamp);
			notifications.add(notification);
		});

		$('#done-restock').click((e) => {
			const stock = parseInt($('#input-restock').val().trim() || 0);
			const remaining = parseInt($(e.currentTarget).attr('remaining'));
			const threshold = $(e.currentTarget).attr('threshold');
			if (!((stock + remaining) > threshold)) {
				swal("Stock did not meet above the maximum threshold.");
				return false;
			}
			dialog_restock.close();
			$('.mdc-linear-progress').addClass('mdc-linear-progress--indeterminate');
			transactions++;
			const productId = $(e.currentTarget).attr('product-id');

			const productRef = products.doc(productId);
			return db.runTransaction(transaction => {
				return transaction.get(productRef)
					.then(doc => {
						if (!doc.exists) {
							return 'Document does not exist';
						}

						var newStock = parseInt((doc.data().stock || 0)) + stock;
						transaction.update(productRef, {stock: newStock});
						return null;
					})
					.catch(err => {
						transactions--;
						if (transactions === 0) {
							$('.mdc-linear-progress').removeClass('mdc-linear-progress--indeterminate');
						}
						swal({
							title: "Failed!",
							text: err.message,
							icon: "error",
							button: "OKAY",
						});
					})
			})
				.then(() => {
					transactions--;
					if (transactions === 0) {
						$('.mdc-linear-progress').removeClass('mdc-linear-progress--indeterminate');
					}
					swal({
						title: "Good Job!",
						text: "The product stock has been resolved.",
						icon: "success",
						button: "DONE",
					});
					return null;
				})
				.catch(err => {
					transactions--;
					if (transactions === 0) {
						$('.mdc-linear-progress').removeClass('mdc-linear-progress--indeterminate');
					}
					swal({
						title: "Failed!",
						text: err.message,
						icon: "error",
						button: "OKAY",
					});
				});
		});

	}

	function report() {

		const report_dates = {};

		const reports_table = $('#reports-table').DataTable({
			"pagingType": "simple",
			"order": [[ 2, "desc" ]],
			"columnDefs": [ {
				"targets": [3],
				"orderable": false
			}],
			dom: 'Blfrtip',
			buttons: [
			    { extend: 'print', className: 'mdc-button mdc-button--raised print_button' }
			]
		});

		const sold_table = $('#sold-table').DataTable({
			"pagingType": "simple",
			dom: 'Blfrtip',
			buttons: [
			    { extend: 'print', className: 'mdc-button mdc-button--raised print_button' }
			]
		});

		function sameDay(d1, d2) {
		  return d1.getFullYear() === d2.getFullYear() &&
		    d1.getMonth() === d2.getMonth() &&
		    d1.getDate() === d2.getDate();
		}

		function fetchSoldItems(sales_order) {
			var keys = {};
			sold_table.clear().draw();
			const productss = sales_order.products;
			const promises = [];
			for (var productId in productss) {
				const sold = productss[productId].stock;
				const price = productss[productId].price;
				const total = productss[productId].total_sales;
				keys[productId] = {
					sold: sold,
					price: price,
					total: total
				}
				const promise = products.doc(productId).get(getOptions);
				promises.push(promise);
			}
			return Promise.all(promises)
				.then(docs => {
					docs.forEach(doc => {
						const productId = doc.id;
						const product = doc.data();
						const dataset = [product.name, keys[productId].sold, keys[productId].total];
						sold_table.rows.add([dataset]).draw().nodes().to$().addClass('sold_item_' + doc.id);
					});
					return null;
				})
				.catch(err => console.log(err));
				
		}

		function salesView(sales_order, id, change) {
			const btn_view = '<button sales_order="'+encodeURIComponent(JSON.stringify(sales_order))+'" id="'+id+'" class="mdc-button view_sold_products btn_view_'+id+'" type="button">VIEW</button>';
			var dataset = [Object.keys(sales_order.products).length || 0, sales_order.uid, 
			(sales_order.timestamp !== undefined && sales_order.timestamp !== null ? dateFormat((sales_order.timestamp).toDate(), "dddd, mmmm dS, yyyy") : '...') || null, btn_view];
		 	if (change !== null) {
		 		if (change.type === 'added') {
		 			reports_table.rows.add([dataset]).draw().nodes().to$().addClass(id);
		 		}
		 		/*if (change.type === 'modified') {
		 			reports_table.row('.' + id).data(dataset).draw();
		 		}*/
		 		if (change.type === 'removed') {
		 			reports_table.row('.' + id).remove().draw();
		 		}
		 		getUserRecord({uid: sales_order.uid})
		 			.then(userRecord => {
		 				const name = userRecord.data.displayName;
		 				dataset[1] = (name || 'Seller');
		 				reports_table.row('.' + id).data(dataset).draw();
		 				return null;
		 			})
		 			.catch(err => console.log(err));
		 	}else {
		 		reports_table.rows.add([dataset]).draw().nodes().to$().addClass(id);
		 		getUserRecord({uid: sales_order.uid})
		 			.then(userRecord => {
		 				const name = userRecord.data.displayName;
		 				dataset[1] = (name || 'Seller');
		 				reports_table.row('.' + id).data(dataset).draw();
		 				return null;
		 			})
		 			.catch(err => console.log(err));
		 	}
			// new MDCRipple(document.querySelector('.btn_view_' + id));
		}

		function generateStrProductLog(docs, date, sales) {
			var str = '<div id="sales_container_'+date+'" style="margin-left: 24px; display: none;">';
			docs.forEach(doc => {
				if (doc.exists) {
					const product = doc.data();

					const name = product.name;
					const sale = sales[doc.id]; // doc.id == productId
					str += '<button product="'+encodeURIComponent(JSON.stringify(product))+'" class="mdc-icon-button material-icons show_product" id="log-product-'+doc.id+'-'+date+'">info</button> <span class="mdc-typography--button">'+ name +' </span> <span class="mdc-typography--caption"> - '+sale+'</span><br>'
				}
			});
			str += '</div>';
			return str;
		}

		function generateStrCont(date, docs, sales) {
			const str = '<div>\
				          <div>\
				            <span class="mdc-typography--overline" style="text-decoration: underline;"><strong>'+date+'</strong></span>\
				            <button id="toggle-'+date+'"\
				               date="'+date+'"\
				               class="mdc-icon-button toggle-icon"\
				               aria-label="View sales"\
				               aria-hidden="true"\
				               aria-pressed="false"\
				               style="margin-bottom: -40px;">\
				               <i class="material-icons mdc-icon-button__icon mdc-icon-button__icon--on">indeterminate_check_box</i>\
				               <i class="material-icons mdc-icon-button__icon">check_box_outline_blank</i>\
				            </button>\
				          </div>\
				          '+generateStrProductLog(docs, date, sales)+'\
				        </div>';
	        return str;

			/*$('#log_container').append(str);
	        new MDCIconButtonToggle(document.getElementById('toggle-' + date));
	        new MDCRipple(document.getElementById('toggle-' + date)).unbounded = true;
	        docs.forEach(doc => {
	        	if (doc.exists) {
	        		new MDCRipple(document.getElementById('log-product-'+doc.id)).unbounded = true;
	        	}
	        });*/
		}

		sales_orders.orderBy('timestamp', 'desc')
			.onSnapshot(snapshot => {
				reports_table.clear().draw();
				snapshot.docChanges().forEach(change => {
					const sales_order = change.doc.data();
					sales_order.id = change.doc.id;
					const date_sold = dateFormat((sales_order.timestamp).toDate(), "dddd, mmmm dS, yyyy");
					if (report_dates.hasOwnProperty(date_sold)) {
						var old_sales_order = report_dates[date_sold];
						for (var productId in sales_order.products) {
							if (old_sales_order.products.hasOwnProperty(productId)) {
								const newStock = sales_order.products[productId].stock;
								const oldStock = old_sales_order.products[productId].stock
								const sumStock = parseInt(newStock || 0) + parseInt(oldStock || 0);
								report_dates[date_sold].products[productId].stock = sumStock;
							}else {
								report_dates[date_sold].products[productId] = sales_order.products[productId];
							}
						}
					}else {
						report_dates[date_sold] = sales_order;
					}
				});
				for (var date in report_dates) {
					const sales_order = report_dates[date];
					salesView(sales_order, sales_order.id, null);
				}
			});

		/*tally
			.onSnapshot(querySnapshot => {
				var length = querySnapshot.size;
				const final_docs = [];
				const tallies = [];
				const dates = [];
				querySnapshot.forEach(doc => {
					const tally = doc.data();
					const sales = tally.sales || null;
					if (sales !== null) {
						const date = doc.id;
						const promises = [];
						for (var productId in sales) {
							promises.push(products.doc(productId).get());
						}
						return Promise.all(promises)
							.then(docs => {
								tallies[date] = generateStrCont(date, docs, sales);
								final_docs[date] = docs;
								dates.push(date);
								length--;
								if (length === 0) {
									dates.sort();
									
									dates.forEach(final_date => {
										$('#log_container').prepend(tallies[final_date]);
										new MDCIconButtonToggle(document.getElementById('toggle-' + final_date));
										new MDCRipple(document.getElementById('toggle-' + final_date)).unbounded = true;
										final_docs[final_date].forEach(doc => {
											if (doc.exists) {
												new MDCRipple(document.getElementById('log-product-'+doc.id+'-'+final_date)).unbounded = true;
											}
										});
									});
								}
								return null;
							})
							.catch(err => console.log(err));
					}
				});
			});*/

		$('body').on('click', '.toggle-icon', (e) => {
			const date = $(e.currentTarget).attr('date');
			$('#sales_container_' + date).slideToggle();
		});

		function resetTime(date, isEnd) {
			date.setHours("00");
			date.setMinutes("00");
			date.setSeconds("00");
			if (isEnd) {
				date.setDate(date.getDate() + 1);
			}
			return date;
		}

		$('#go').click(() => {
			const start = resetTime(new Date($('#sales-start').val()), false);
			var end = resetTime(new Date($('#sales-end').val()), true);

			console.log(end);

			var query = sales_orders;
			if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
				if (start > end) {
					swal({
						title: "Invalid Date",
						text: "The date is invalid for filtering.",
						icon: "warning",
						button: "OKAY",
					});
					return false;
				}
				query = query.where("timestamp", ">=", start).where("timestamp", "<=", end);
			}

			query = query.orderBy("timestamp", "desc");
			query.get()
				.then(querySnapshot => {
					reports_table.clear().draw();
					if (querySnapshot.size > 0) {
						for (var member in report_dates) delete report_dates[member];
						querySnapshot.forEach(doc => {
							const sales_order = doc.data();
							sales_order.id = doc.id;
							const date_sold = dateFormat((sales_order.timestamp).toDate(), "dddd, mmmm dS, yyyy");
							if (report_dates.hasOwnProperty(date_sold)) {
								var old_sales_order = report_dates[date_sold];
								for (var productId in sales_order.products) {
									if (old_sales_order.products.hasOwnProperty(productId)) {
										const newStock = sales_order.products[productId].stock;
										const oldStock = old_sales_order.products[productId].stock
										const sumStock = parseInt(newStock || 0) + parseInt(oldStock || 0);
										report_dates[date_sold].products[productId].stock = sumStock;
									}else {
										report_dates[date_sold].products[productId] = sales_order.products[productId];
									}
								}
							}else {
								report_dates[date_sold] = sales_order;
							}
						});
						console.log(report_dates);
						for (var date in report_dates) {
							const sales_order = report_dates[date];
							salesView(sales_order, sales_order.id, null);
						}
					}
					return null;
				})
				.catch(err => console.log(err));
		});

		$('body').on('click', '.view_sold_products', (e) => {
			const sales_order = JSON.parse(decodeURIComponent($(e.currentTarget).attr('sales_order')));
			fetchSoldItems(sales_order);
			dialog_sold.open();
		});

	}

	function users() {
		$('#crane-shipping-form').submit((e) => {
			e.preventDefault();

			const isChecked = switchUser.checked;
				
			var values = {};
			$.each($(e.currentTarget).serializeArray(), (i, field) => {
		    	values[field.name] = field.value;
			});

			if (values.confirm.trim() !== values.password.trim()) {
				swal("Password does not match!");
				return false;
			}

			values.userType = switchUser.checked ? 'tindera' : 'owner';

			$('.mdc-linear-progress').addClass('mdc-linear-progress--indeterminate');
			transactions++;
			$('#submit-user').prop('disabled', true);
			return insertNewUser(values)
				.then(result => {
					if (result.data) {
						swal({
							title: "Good Job!",
							text: "New store owner has been added successfully.",
							icon: "success",
							button: "INSERTED",
						});
						resetInput('#crane-shipping-form');
					}else {
						swal({
							title: "Failed",
							text: "Sorry but adding new store owner cannot done at this moment. Please try again later.",
							icon: "error",
							button: "OKAY",
						});
					}
					transactions--;
					if (transactions === 0) {
						$('.mdc-linear-progress').removeClass('mdc-linear-progress--indeterminate');
					}
					$('#submit-user').prop('disabled', false);
					return null;
				})
				.catch(error => {
					swal({
						title: "Failed",
						text: error.message,
						icon: "error",
						button: "DONE",
					});
					$('#submit-user').prop('disabled', false);
					$('#submit-user').prop('disabled', false);
					transactions--;
					if (transactions === 0) {
						$('.mdc-linear-progress').removeClass('mdc-linear-progress--indeterminate');
					}
					$('#submit-user').prop('disabled', false);
				});
		
		});

		$('#user-switch').change(() => {
			const isChecked = switchUser.checked;
			if (isChecked) {
				$('#headline-register').text('Add a Seller');
			}else {
				$('#headline-register').text('Add Store Owner');
			}
		});

		return null;
	}

	function inventory() {
		$.fn.dataTable.ext.classes.sPageButton = 'mdc-button'; // Change Pagination Button Class
		const category_table = $('#category_table').DataTable({
			"pagingType": "simple",
			"columnDefs": [ {
				"targets": [2],
				"orderable": false
			}]
		});
		const subcategory_table = $('#subcategory_table').DataTable({
			"pagingType": "simple",
			"columnDefs": [ {
				"targets": [4],
				"orderable": false
			}]
		});
		const product_table = $('#product_table').DataTable({
			"pagingType": "simple",
			"columnDefs": [ 
				{
					"targets": [4],
					"orderable": false
				},
			],
		});

		const price_table = $('#price_table').DataTable({
			"pagingType": "simple",
			"columnDefs": [ {
				"targets": 2,
				"orderable": false
			}]
		});

		$('#add-product-size').click(() => {
			const size = $('#product-sizes').val().trim();
			if (size.length > 0) {
				if (chipSet4.chips.length === 0) {
					$('#chip-sizes').show();
				}
				generateSizeChip('productId', size, true);
				$('#product-sizes').val('');
				$('#add-product-size').prop('disabled', true);
				$('#chip-sizes').show();
			}
		});

		function addCategory() {
			const category = $('#category-input').val().trim();
			const action = $('#category-dialog-title').text();

			if (category !== null && category !== '') {
				const category_id = $('#category-dialog-title').attr('category-id');

				dialog_add_category.close();
				var data = {
					name: category,
					products: 0	
				};

				if (category_image !== null) {
					$('.mdc-linear-progress').addClass('mdc-linear-progress--indeterminate');
					transactions++;
					const metadata = {
					  contentType: 'image/jpeg',
					};
					const ref = categoryImages.child(uid + "****" + category_id);
					const uploadTask = ref.put(category_image, metadata);

					uploadTask.on('state_changed', snapshot => console.log("Uploading image..."), error => console.log(error), () => {
						category_image = null;
						return uploadTask.snapshot.ref.getDownloadURL()
							.then(downloadURL => {
								data['image'] = downloadURL;
								if (action.toLowerCase().startsWith('update')) {
									categories.doc(category_id).update(data); 
									//eslint-disable-next-line
									swal("Done! Category \'"+ category +"\' has been updated!", {
								      icon: "success",
								    });
								}else {
									categories.add(data);
									//eslint-disable-next-line
									swal("Done! Category \'"+ category +"\' has been added!", {
								      icon: "success",
								    });
								}
								transactions--;
								if (transactions === 0) {
									$('.mdc-linear-progress').removeClass('mdc-linear-progress--indeterminate');
								}

								return null;
							})
							.catch(err => console.log(err.message));
					});
				}else {
					if (action.toLowerCase().startsWith('update')) {
						if ($('#image').attr('src') === no_image) {
							categories.doc(category_id).set(data);
						}else {
							categories.doc(category_id).update(data);
						}
						//eslint-disable-next-line
						swal("Done! Category \'"+ category +"\' has been updated!", {
				      		icon: "success",
					    })
					}else {
						categories.add(data);
						//eslint-disable-next-line
						swal("Done! Category \'"+ category +"\' has been added!", {
				      		icon: "success",
					    })
					}
				}				
			}
		}

		$('#add-category').click(() => {
			resetInput('#add-category-form');
			$('#image').attr('src', no_image);
			$('#category-dialog-title').text('Add Category');
			$('#image,.button-delete-image').unbind('mouseenter').unbind('mouseleave');
			category_image = null;
			dialog_add_category.open();
		});

		$('#add-category-form').submit((e) => {
			e.preventDefault();
			addCategory();
		});

		$('#category-image').change((e) => {
			const that = $(e.currentTarget);
			readURL(that[0]);
		});

		$('#product-image').change((e) => {
			const that = $(e.currentTarget);
			readURL_product(that[0]);
		});

		$('#add-product').click(() => {
			resetInput('#form-product');
			select_category.selectedIndex = -1;
			select_type.selectedIndex = -1;
			$('#product_image').attr('src', no_image);
			$('#dialog-add-product-title').text('Add Product');
			$('#chip-inventory').empty();
			$('#chip-sizes').empty();
			chipSet4 = new MDCChipSet(chipSetEl4);
			dialog_add_product.open();
			unBindImage();
		});

		categories
			.onSnapshot((snapshot) => {
				const categoryHolder = $('#product-placeholder');
				const selectHolder = $('#select-category-container');

				selectHolder.empty();

				snapshot.forEach(doc => {
					const category = doc.data();
					const list = '<li class="mdc-list-item" data-value="'+doc.id+'" role="option">\
						'+category.name+'\
            		</li>';
            		selectHolder.append(list);
				});

				snapshot.docChanges().forEach((change) => {
					const category = change.doc.data();
					const categoryId = change.doc.id;
					category.id = categoryId;

					var categoryImage = category.image;
					if (categoryImage === undefined || categoryImage === null) {
						categoryImage = no_image;
					}

					var elements = '\
						<button class="edit-category mdc-icon-button material-icons edit_'+categoryId+'" name="'+category.name+'" id="'+categoryId+'">border_color</button>\
						<button class="add-sub-category mdc-icon-button material-icons add_'+categoryId+'" name="'+category.name+'" id="'+categoryId+'">add_circle</button>\
						<button class="delete-category mdc-icon-button material-icons delete_'+categoryId+'" name="'+category.name+'" id="'+categoryId+'">delete</button>\
					';
					if (userType === 'tindera') {
						elements = '\
							<button class="edit-category mdc-icon-button material-icons edit_'+categoryId+'" name="'+category.name+'" id="'+categoryId+'">border_color</button>\
							<button class="add-sub-category mdc-icon-button material-icons add_'+categoryId+'" name="'+category.name+'" id="'+categoryId+'">add_circle</button>\
						';
					}
					const imageElem = '<img src="'+categoryImage+'" width="70" height="70" />';
					const dataset = [category.name, category.products || 0, elements];

					if (change.type === 'added') {
						category_table.rows.add([dataset]).draw().nodes().to$().addClass(categoryId);
						categoryHolder.append(categoryView(category));

						const sub_categories = categories.doc(change.doc.id).collection('sub_categories');
						// Sub categories of each category
						sub_categories
							.onSnapshot(snapshot1 => {
								snapshot1.docChanges().forEach(change1 => {
									const sub_category = change1.doc.data();
									sub_category.id = change1.doc.id;
									var button = '<button name="'+sub_category.name+'" category-id="'+categoryId+'" sub-category-id="'+change1.doc.id+'" class="mdc-button mdc-button--dense update-sub-category">UPDATE</button><button category-id="'+categoryId+'" sub-category-id="'+change1.doc.id+'" sub-category="'+encodeURIComponent(JSON.stringify(sub_category))+'" class="mdc-button mdc-button--dense delete-sub-category">DELETE</button>';
									if (userType === 'tindera') {
										button = '<button name="'+sub_category.name+'" category-id="'+categoryId+'" sub-category-id="'+change1.doc.id+'" class="mdc-button mdc-button--dense update-sub-category">UPDATE</button>';
									}
									const dataset1 = [sub_category.name, category.name, sub_category.products, dateFormat((sub_category.timestamp).toDate(), "dddd, mmmm dS, yyyy, h:MM:ss TT") || null, button];
									if (change1.type === 'added') {
										subcategory_table.rows.add([dataset1]).draw().nodes().to$().addClass(change1.doc.id);
									}
									if (change1.type === 'modified') {
										subcategory_table.row('.' + change1.doc.id).data(dataset1).draw();
									}
									if (change1.type === 'removed') {
										subcategory_table.row('.' + change1.doc.id).remove().draw();
									}
									if (userType !== 'tindera') {
										new MDCRipple(document.querySelector('.delete_' + categoryId));
									}
								});
							});
					}
					if (change.type === 'modified') {
						category_table.row('.' + categoryId).data(dataset).draw();
						$('#category-' + categoryId).replaceWith(categoryView(category));
					}
					if (change.type === 'removed') {
						category_table.row('.' + categoryId).remove().draw();
						$('#category-' + categoryId).remove();
					}

					if ($('.edit_' + categoryId).length > 0) {
						new MDCRipple(document.querySelector('.edit_' + categoryId)).unbounded = true;
					}
					if ($('.add_' + categoryId).length > 0) {
						new MDCRipple(document.querySelector('.add_' + categoryId)).unbounded = true;
					}
					if ($('.delete_' + categoryId).length > 0 && userType !== 'tindera') {
						new MDCRipple(document.querySelector('.delete_' + categoryId)).unbounded = true;
					}
				});
			});

		measurements
			.onSnapshot((snapshot) => {
				$('#measurement-list').empty();
				snapshot.forEach(doc => {
					const measurement = doc.data();
					const list = '<li class="mdc-list-item" data-value="'+doc.id+'" role="option">'+measurement.name+'</li>'
					$('#measurement-list').append(list);
				});
				snapshot.docChanges().forEach((change) => {
					const measurement = change.doc.data();
					const measurementId = change.doc.id;
					measurement.id = measurementId;

					const price_button = '<button class="mdc-button mdc-button--unelevated measurement_'+measurementId+' set_price" measurement="'+encodeURIComponent(JSON.stringify(measurement))+'">EDIT</button>';
					const delete_mea = '<button class="mdc-button delete_measurement_'+measurementId+' delete_measurement" name="'+measurement.name+'" measurement_id="'+measurementId+'">DELETE</button>';
					const button = price_button + delete_mea;
					const dataset_price = [measurement.name, measurement.timestamp, button];

					if (change.type === 'added') {
						price_table.rows.add([dataset_price]).draw().nodes().to$().addClass(measurementId);
					}
					if (change.type === 'modified') {
						price_table.row('.' + measurementId).data(dataset_price).draw();
					}
					if (change.type === 'removed') {
						price_table.row('.' + measurementId).remove().draw();
					}

					if ($('.price_' + measurementId).length > 0) {
						new MDCRipple(document.querySelector('.price_' + measurementId));
					}
				});
			});

		products
			.onSnapshot((snapshot) => {

				snapshot.docChanges().forEach((change) => {
					const product = change.doc.data();
					const productId = change.doc.id;
					product.id = productId;

					var hehehe = '';
					if (product.size !== undefined && product.size !== null && product.size.length !== null && product.size.length !== undefined && product.size.length > 0) {
						for (var i = 0; i < product.size.length; i++) {
							hehehe += '<i>' + product.size[parseInt(i)] + '</i>';
							if (i !== product.size.length - 1) {
								hehehe += " ,";
							}
						}
					}

					var elements = '\
						<button class="edit-product mdc-icon-button material-icons edit_'+productId+'" mdc-icon-button material-icons product="'+encodeURIComponent(JSON.stringify(product))+'">border_color</button>\
						<button class="delete-product mdc-icon-button material-icons delete_'+productId+'" name="'+product.name+'" mdc-icon-button material-icons id="'+productId+'">delete</button>\
						<button class="show_product mdc-icon-button material-icons info_'+productId+'" mdc-icon-button material-icons id="'+productId+'" product="'+encodeURIComponent(JSON.stringify(product))+'">info</button>\
					';
					if (userType === 'tindera') {
						elements = '\
						<button class="edit-product mdc-icon-button material-icons edit_'+productId+'" mdc-icon-button material-icons product="'+encodeURIComponent(JSON.stringify(product))+'">border_color</button>\
						<button class="show_product mdc-icon-button material-icons info_'+productId+'" mdc-icon-button material-icons id="'+productId+'" product="'+encodeURIComponent(JSON.stringify(product))+'">info</button>\
					';
					}
					const imageElem = '<img src="'+(product.image || no_image)+'" width="70" height="70" style="border-radius: 8%;" />';

					const dataset = [product.name, hehehe, setStock(product.stock || 0, (product.threshold || warning_threshold)), (product.threshold || warning_threshold), product.category.name, elements];
					
					if (change.type === 'added') {
						product_table.rows.add([dataset]).draw().nodes().to$().addClass(productId);
					}
					if (change.type === 'modified') {
						product_table.row('.' + productId).data(dataset).draw();
					}
					if (change.type === 'removed') {
						product_table.row('.' + productId).remove().draw();
					}

					if ($('.edit_' + productId).length > 0) {
						new MDCRipple(document.querySelector('.edit_' + productId)).unbounded = true;
					}
					if ($('.delete_' + productId).length > 0) {
						new MDCRipple(document.querySelector('.delete_' + productId)).unbounded = true;
					}
					if ($('.info_' + productId).length > 0) {
						new MDCRipple(document.querySelector('.info_' + productId)).unbounded = true;
					}
				});
			});

		function bindImage() {
			$('#image,#product_image,.button-delete-image').bind('mouseenter', (e) => {
				$('#image').css({opacity: 0.7}).addClass('mdc-elevation--z2');
				$('.button-delete-image').show();
			});	
			$('#image,#product_image,.button-delete-image').bind('mouseleave', (e) => {
				$('#image').css({opacity: 1.0}).removeClass('mdc-elevation--z2');
				$('.button-delete-image').hide();
			});

			$('.button-delete-image').mouseenter((e) => {
				$(e.currentTarget).addClass('mdc-button--raised');
			});
			$('.button-delete-image').mouseleave((e) => {
				$(e.currentTarget).removeClass('mdc-button--raised');
			});
		}

		function unBindImage() {
			$('#image,#product_image,.button-delete-image').unbind('mouseenter').unbind('mouseleave');
			$('.button-delete-image').hide();
			$('#image,#product_image').css({opacity: 1.0}).removeClass('mdc-elevation--z2').attr('src', no_image);
			document.getElementById("category-image").value = "";
			category_image = null;
			product_image = null;
		}

		function readURL(input) {
		    if (input.files && input.files[0]) {

		        var reader = new FileReader();
		        reader.onload = function (e) {
		        	$('#image').attr('src', e.target.result);
		        	category_image = input.files[0];
		        };
		        reader.readAsDataURL(input.files[0]);
		        bindImage();
		    }
		}

		function readURL_product(input) {
		    if (input.files && input.files[0]) {

		        var reader = new FileReader();
		        reader.onload = function (e) {
		        	$('#product_image').attr('src', e.target.result);
		        	product_image = input.files[0];
		        };
		        reader.readAsDataURL(input.files[0]);
		        bindImage();
		    }
		}

		$('body').on('click', '.edit-category', (e) => {
			const id = $(e.currentTarget).attr('id');
			const name = $(e.currentTarget).attr('name');
			category_image = null;

			resetInput('#add-category-form');

			categories.doc(id).get(getOptions)
				.then(doc => {
					const category = doc.data();
					var image = category.image;
					if (image === undefined || image === null) {
						image = no_image;
						$('#image,.button-delete-image').unbind('mouseenter').unbind('mouseleave');
					}else {
						bindImage();
					}

					$('#image').attr('src', image);
					assignValue('.category-name', category.name);

					return null;
				})
				.catch(err => console.log(err.message));

			$('#category-dialog-title').text('Update Category');
			$('#category-dialog-title').attr('category-id', id);
			dialog_add_category.open();
		});


		$('body').on('click', '.delete-category', (e) => {

			const name = $(e.currentTarget).attr('name');

			swal({
			  title: "Are you sure?", //eslint-disable-next-line
			  text: "Once deleted, all the products under \'"+ name +"\' will be deleted also.",
			  icon: "warning",
			  buttons: true,
			  dangerMode: true,
			})
			.then((willDelete) => {
			  if (willDelete) {
			  	const id = $(e.currentTarget).attr('id');
			  	categories.doc(id).delete();
			  	snackbar_upload.labelText = 'Category \''+name+'\' has been deleted successfully.';
			  	snackbar_upload.open();
			  }
			  return null;
			})
			.catch(err => console.log(err.message));
		});

		$('body').on('click', '.edit-product', (e) => {
			const product = JSON.parse(decodeURIComponent($(e.currentTarget).attr('product')));
			const id = product.id;
			resetInput('#form-product');
			select_category.selectedIndex = -1;
			select_type.selectedIndex = -1;
			for (var attr in product) {
				if (!Object.prototype.hasOwnProperty.call(product, attr) || attr === 'id') {
					continue;
				}else if (attr === 'category') {
					select_category.value = product[attr].id;
				}else if (attr === 'type') {
					select_type.value = product[attr].id;
				}else {
					assignValue('.product-' + attr, product[attr]);
				}	
			}
			$('#dialog-add-product-title').text('Update Product').attr('product-id', id).attr('sub-product-id', (product.sub_category_id || "null"));
			if (product.image !== undefined && product.image !== null) {
				$('#product_image').attr('src', product.image);
				bindImage();
			}else {
				$('#product_image').attr('src', no_image);
				unBindImage();
			}
			$('#chip-inventory').empty();	
			$('#chip-sizes').empty();

			chipSet4 = new MDCChipSet(chipSetEl4);

			if (product.size !== undefined && product.size !== null && product.size.length !== null && product.size.length !== undefined && product.size.length > 0) {
				$('#chip-sizes').show();
				for (var size in product.size) {
					generateSizeChip('productId', product.size[parseInt(size)], false);
				}
			}else {
				$('#chip-sizes').hide();
			}
			dialog_add_product.open();
		});

		$('body').on('click', '.delete-product', (e) => {
			const name = $(e.currentTarget).attr('name');
			swal({
			  title: "Are you sure?", //eslint-disable-next-line
			  text: "Delete \'"+ name +"\' from your products?",
			  icon: "warning",
			  buttons: true,
			  dangerMode: true,
			})
			.then((willDelete) => {
			  if (willDelete) {
			  	const id = $(e.currentTarget).attr('id');
			  	products.doc(id).delete();
			  	snackbar_upload.labelText = 'Product \''+name+'\' has been deleted successfully.';
			  	snackbar_upload.open();
			  }
			  return null;
			})
			.catch(err => console.log(err.message));
		});

		$('#form-product').submit((e) => {
			e.preventDefault();
			const action = $('#dialog-add-product-title').text().split(' ')[0].toLowerCase();
			const id = $('#dialog-add-product-title').attr('product-id');
			
			var values = {};
			$.each($(e.currentTarget).serializeArray(), (i, field) => {
				const attr = (field.name.split('-')[1]);
				if (attr === 'category' || attr === 'type') {
					values[attr] = {
						id: field.value,
						name: $('#demo-selected-' + attr).text()
					}
				}else {
					values[attr] = field.value || null;
				}
			});
			values.stock = parseInt(values.stock || 0);
			values.threshold = parseInt(values.threshold || 10);

			const chipId = chipSet2.selectedChipIds || null;
			if (chipId.length > 0) {
				const subCategoryId = $($('#' + chipId)[0]).attr('sub-product-id') || null;
				values.sub_category_id = subCategoryId;
			}

			const chips = chipSet4.chips || null;
			if (chips.length > 0) {
				const arrs = [];
				chips.forEach(chip => {
					const size_name = chip.root_.attributes[2].nodeValue;
					arrs.push(size_name);
				});
				values.size = arrs;
			}

			if (product_image !== null) {
				snackbar_upload.labelText = 'Please wait. New product is adding...';
				if (snackbar.isOpen) {
					snackbar.close();
				}
				snackbar_upload.open();

				$('.mdc-linear-progress').addClass('mdc-linear-progress--indeterminate');
				transactions++;
				const metadata = {
				  contentType: 'image/jpeg',
				};
				const ref = productImages.child(uid + "****" + id);
				const uploadTask = ref.put(product_image, metadata);

				uploadTask.on('state_changed', snapshot => console.log("Uploading image..."), error => console.log(error), () => {
					product_image = null;
					return uploadTask.snapshot.ref.getDownloadURL()
						.then(downloadURL => {
							values['image'] = downloadURL;

							if (action === 'add') {
								products.add(values)
									.catch((err) => console.log(err.message));
								//eslint-disable-next-line
								swal("Done! Product \'"+ values.name +"\' has been "+action+"ed!", { icon: "success", }); 
							}else {
								products.doc(id).set(values, {merge: true})
									.catch((err) => console.log(err.message));
								//eslint-disable-next-line
								swal("Done! Product \'"+ values.name +"\' has been "+action+"ed!", { icon: "success", }); 
							}
							transactions--;
							if (transactions === 0) {
								$('.mdc-linear-progress').removeClass('mdc-linear-progress--indeterminate');
							}

							return null;
						})
						.catch(err => console.log(err.message));
				});
			}else {

				if (action === 'add') {
					products.add(values)
						.catch((err) => console.log(err.message));
					//eslint-disable-next-line
					swal("Done! Product \'"+ values.name +"\' has been "+action+"ed!", { icon: "success", }); 
				}else {

					if ($('#product_image').attr('src') === no_image) {
						products.doc(id).set(values, {merge: true});
					}else {
						products.doc(id).update(values);
					}

					//eslint-disable-next-line
					swal("Done! Product \'"+ values.name +"\' has been "+action+"ed!", { icon: "success", }); 
				}
			}
			
		});

		tabBar.listen('MDCTabBar:activated', (detail) => {
			const index = detail.detail.index;
			if (index === 0) {
				$('#category_content').hide();
				$('#price_content').hide();
				$('#product_content').fadeIn();
			}else if (index === 1) {
				$('#product_content').hide();
				$('#price_content').hide();
				$('#category_content').fadeIn();
			}else {
				$('#product_content').hide();
				$('#category_content').hide();
				$('#price_content').fadeIn();
			}
		});

		$('.button-delete-image').click(() => unBindImage());

		$('#add-measurement').click(() => {
			$('#price_product_name').attr('measurement-id', 'none');
			new MDCTextField(document.querySelector('.mdc-text-field--with-leading-icon')).value = '';
			dialog_price.open();
		});

		$('body').on('click', '.set_price', (e) => {
			const measurement = JSON.parse(decodeURIComponent($(e.currentTarget).attr('measurement')));
			$('#price_product_name').text(measurement.name).attr('measurement-id', measurement.id).attr('measurement', measurement.name);
			new MDCTextField(document.querySelector('.mdc-text-field--with-leading-icon')).value = measurement.name;
			dialog_price.open();
		});

		$('body').on('click', '.delete_measurement', (e) => {
			const measurement_id = $(e.currentTarget).attr('measurement_id');
			const name = $(e.currentTarget).attr('name');
			swal({
			  title: "Are you sure?", //eslint-disable-next-line
			  text: "Are you sure to delete measurement \'"+ name +"\'?",
			  icon: "warning",
			  buttons: true,
			  dangerMode: true,
			})
			.then((willDelete) => {
			  if (willDelete) {
			  	measurements.doc(measurement_id).delete();
			  }
			  return null;
			})
			.catch(err => console.log(err.message));
		});

		$('#set-price').click(() => {
			const measurementId = $('#price_product_name').attr('measurement-id');
			const measurementName = $('#price-input').val();
			if (measurementId !== 'none') {
				measurements.doc(measurementId).update({name: measurementName})
					.catch((err) => console.log(err.message));
			}else {
				const measurement = {
					name: measurementName,
					timestamp: firebase.firestore.FieldValue.serverTimestamp()
				}
				measurements.add(measurement)
					.catch((err) => console.log(err.message));
			}
		});

		function makeDocId() {
			var result           = '';
			var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
			var charactersLength = characters.length;
			for ( var i = 0; i < 20; i++ ) {
				result += characters.charAt(Math.floor(Math.random() * charactersLength));
			}
			return result;
		}

		function generateChip(category, isNew) {
			var newElem = '';
			if (isNew) { newElem = '<i class="material-icons mdc-chip__icon mdc-chip__icon--leading">fiber_new</i>';}
			var elem = '<div category="'+encodeURIComponent(JSON.stringify(category))+'" class="mdc-chip mdc-chip-sub" category-id="'+category.id+'" value="'+category.name+'">\
					'+newElem+'\
	        		<div class="mdc-chip__text">'+category.name+'</div>\
	            	<i class="material-icons mdc-chip__icon mdc-chip__icon--trailing" tabindex="0" role="button">cancel</i>\
	      		</div>';
      		$('#no_sub').hide();
      		$('#chip-category').show();
      		const chipEl = $($.parseHTML(elem))[0];
      		chipSetEl.appendChild(chipEl);
      		chipSet.addChip(chipEl);
		}

		function generateSizeChip(productId, size, isNew) {
			var newElem = '';
			if (isNew) { newElem = '<i class="material-icons mdc-chip__icon mdc-chip__icon--leading">star</i>';}
			var elem = '<div product-id="'+productId+'" class="mdc-chip mdc-chip-sizes" size-name="'+size+'">\
					'+newElem+'\
	        		<div class="mdc-chip__text">'+size+'</div>\
	            	<i class="material-icons mdc-chip__icon mdc-chip__icon--trailing delete-product-size" tabindex="0" role="button">cancel</i>\
	      		</div>';
      		const chipEl = $($.parseHTML(elem))[0];
      		chipSetEl4.appendChild(chipEl);
      		chipSet4.addChip(chipEl);
		}

		$('body').on('click', '.update-sub-category', (e) => {
			const name = $(e.currentTarget).attr('name');
			const subCategoryId = $(e.currentTarget).attr('sub-category-id');
			const categoryId = $(e.currentTarget).attr('category-id');
			$('#add-sub-category').attr('sub-category-id', subCategoryId);
			$('#add-sub-category').attr('category-id', categoryId);
			dialog_write_sub.open();
			input2.value = name;
		});

		$('#update-sub').click(() => {
			const action = 'update';
			const categoryId = $('#add-sub-category').attr('category-id');
			const input_val = input2.value;
			processSubCategory(action, categoryId, input_val);
		})

		$('body').on('click', '.delete-sub-category', (e) => {
			const subCategory = JSON.parse(decodeURIComponent($(e.currentTarget).attr('sub-category')));
	  		const subCategoryId = $(e.currentTarget).attr('sub-category-id');
	  		const categoryId = $(e.currentTarget).attr('category-id');
			swal({
			  title: "Are you sure?", //eslint-disable-next-line
			  text: "Are you sure to delete sub category \'"+ subCategory.name +"\'?",
			  icon: "warning",
			  buttons: true,
			  dangerMode: true,
			})
			.then((willDelete) => {
			  if (willDelete) {
			  	deleteSubCategory(subCategory, subCategoryId, categoryId);
			  }
			  return null;
			})
			.catch(err => console.log(err.message));
		});

		function loadProductSubCateg(categoryId) {
			categories.doc(categoryId).collection('sub_categories').get()
				.then((snapshots) => {
					$('#chip-inventory').empty();
					if (snapshots.size === 0) {
						return false;
					}
					snapshots.forEach(doc => {
						const selectedSub = $('#dialog-add-product-title').attr('sub-product-id');
						var selected = '';
						if (selectedSub !== null && selectedSub !== undefined && selectedSub === doc.id) {
							selected = 'mdc-chip--selected';
						}
						const elem = '<div class="mdc-chip '+selected+'" sub-product-id="'+doc.id+'">\
			              <div class="mdc-chip__checkmark">\
			                <svg class="mdc-chip__checkmark-svg" viewBox="-2 -3 30 30">\
			                  <path class="mdc-chip__checkmark-path" fill="none" stroke="black"\
			                        d="M1.73,12.91 8.1,19.28 22.79,4.59"/>\
			                </svg>\
			              </div>\
			              <div class="mdc-chip__text">'+doc.data().name+'</div>\
			            </div>';
			            const chipEl = $($.parseHTML(elem))[0];
			            chipSetEl2.appendChild(chipEl);
			            chipSet2.addChip(chipEl);
			            // console.log(chipSet2.chips.setSelected('mdc-chip-2', true));
					});
					return null;
				})
				.catch((err) => console.log(err));
		}

		function loadSubCategories(isCache, id) {
			if (isCache) {
				categories.doc(id).collection('sub_categories').get(getOptions)
					.then((snapshots) => {
						if (snapshots.size === 0) {
							console.log('No sub categories found in cache');
							loadSubCategories(false, id);
							return false;
						}
						$('#no_sub').hide();
						$('#chip-category').show();
						snapshots.forEach(doc => {
							const subCategory = doc.data();
							subCategory.id = doc.id;
							generateChip(subCategory, false);
						});
						return null;
					})
					.catch((err) => console.log(err));
			}else {
				categories.doc(id).collection('sub_categories').get()
					.then((snapshots) => {
						if (snapshots.size === 0) {
							console.log('No sub categories found');
							$('#no_sub').show();
							$('#chip-category').hide();
							return false;
						}
						$('#no_sub').hide();
						$('#chip-category').show();
						snapshots.forEach(doc => {
							const subCategory = doc.data();
							subCategory.id = doc.id;
							generateChip(subCategory, false);
						});
						return null;
					})
					.catch((err) => console.log(err));
			}
		}

		const input = new MDCTextField(document.querySelector('.sub-category-name'));
		const input2 = new MDCTextField(document.querySelector('.sub-category-name-name'));

		function deleteSubCategory(subCategory, subCategoryId, categoryId) {
			$('#name_sub_category').text(subCategory.name);
			categories.doc(categoryId).collection('sub_categories').doc(subCategoryId).delete();
			snackbar_subcategory.open();
			$('#snackbar-undo-category').attr('category-id', categoryId).attr('category', encodeURIComponent(JSON.stringify(subCategory)));
		}

		chipSet.listen('MDCChip:removal', event => {
	  		const subCategory = JSON.parse(decodeURIComponent($(event.detail.root).attr('category')));
	  		const subCategoryId = $(event.detail.root).attr('category-id');
	  		const categoryId = $('#add-sub-category').attr('category-id');
	  		deleteSubCategory(subCategory, subCategoryId, categoryId);
		});

		chipSet4.listen('MDCChip:removal', event => {
			if (chipSet4.chips.length === 0) {
				$('#chip-sizes').hide();
			}
		});

		$('#snackbar-undo-category').click((e) => {
			const categoryId = $(e.currentTarget).attr('category-id');
			const subCategory = JSON.parse(decodeURIComponent($(e.currentTarget).attr('category')));
			generateChip(subCategory, true);
			const subCategoryId = subCategory.id;
			delete subCategory['id']; 
			categories.doc(categoryId).collection('sub_categories').doc(subCategoryId).set(subCategory);
		});

		$('body').on('click', '.add-sub-category', (e) => {
			const name = $(e.currentTarget).attr('name');
			const id = $(e.currentTarget).attr('id');
			$('#parent_category').text(name);
			$('#add-sub-category').attr('category-id', id);
			
			$('#chip-category').empty();
			loadSubCategories(true, id);
			input.value = '';
			$('#sub-text').text('add');
			$('#sub-action').text('add');
			dialog_sub_category.open();
		});

		function processSubCategory(action, categoryId, input_val) {
			if (input_val === null || input_val === undefined || input_val.trim().length === 0) {
				return false;
			}
			input.value = '';
			if (action === 'add') {
				const docId = makeDocId();
				const sub_category = {
					name: input_val,
					products: 0,
					timestamp: firebase.firestore.FieldValue.serverTimestamp(),
					parent: categoryId
				};
				categories.doc(categoryId).collection('sub_categories').doc(docId).set(sub_category)
					.then(doc => console.log(doc.id))
					.catch(err => console.log(err));
				sub_category.id = docId;
				generateChip(sub_category, true);
			}else if (action === 'update') {
				const subCategoryId = $('#add-sub-category').attr('sub-category-id');
				categories.doc(categoryId).collection('sub_categories').doc(subCategoryId).update({name: input_val});
				$('#sub-text').text('add');
				$('#sub-action').text('add');
				const child = $( "div[category-id='"+subCategoryId+"'] i").length;
				$( "div[category-id='"+subCategoryId+"']").attr('value', input_val);
				$( "div[category-id='"+subCategoryId+"']").removeClass('mdc-chip--selected').children().eq((child - 1)).text(input_val);
			}
		}

		$('#add-sub-category').click(() => {
			const action = $('#sub-text').text();
			const categoryId = $('#add-sub-category').attr('category-id');
			const input_val = input.value;
			console.log(input_val);	
			processSubCategory(action, categoryId, input_val);
		});

		$('body').on('click', '.mdc-chip-sub', (e) => {
			$('#sub-text').text('update');
			$('#sub-action').text('edit');
			input.value = $(e.currentTarget).attr('value');
			$('#add-sub-category').attr('sub-category-id', $(e.currentTarget).attr('category-id'));
			if (!$(e.currentTarget).hasClass('mdc-chip--selected')) {
				$('#sub-text').text('add');
				$('#sub-action').text('add');
				input.value = '';
			}
		});

		select_category.listen('MDCSelect:change', (event) => {
	   		if (event.detail.index !== -1) {
	   			loadProductSubCateg(event.detail.value);
	   		}
	  	});

	  	$('#product-sizes').on('keyup', (e) => {
	  		const value = $(e.currentTarget).val().trim();
	  		if (value.length > 0) {
	  			$('#add-product-size').prop('disabled', false);
	  		}else {
	  			$('#add-product-size').prop('disabled', true);
	  		}
	  	});
	}

	function store() {
		const product_category_table = $('#product-category_table').DataTable({
			"pagingType": "simple",
			"columnDefs": [ {
				"targets": 3,
				"orderable": false
			}]
		});
		const product_list_table = $('#list-product-table').DataTable({
			"pagingType": "simple",
			"columnDefs": [ {
				"targets": 4,
				"orderable": false
			}]
		});
		const cart_table = $('#cart-table').DataTable({
			"pagingType": "simple",
			searching: false, 
			info: false,
			"bSort" : false
		});

		$('#basic-switchh').change(() => {
			const isChecked = switchControl.checked;
			if (isChecked) {
				$('#product-divider').show();
				$('#category-divider').hide();
			}else {
				$('#product-divider').hide();
				$('#category-divider').show();
			}
		});

		$('body').on('mouseenter', '.mdc-image-list__item', (e) => {
			$(e.currentTarget).addClass(productElavation);
		});
		$('body').on('mouseleave', '.mdc-image-list__item', (e) => {
			$(e.currentTarget).removeClass(productElavation);
		});
		$('#search-category').on('keyup', (e) => {
			const value = $(e.currentTarget).val().trim();
			categories.get(getOptions)
				.then(querySnapshot => {
					if (!querySnapshot.empty) {

						const result = [];
						querySnapshot.forEach(doc => {
							const category = doc.data();
							if (value !== null && value !== '') {
								if (category.name.toLowerCase().includes(value.toLowerCase())) {
									result.push(doc);
								}
							}else {
								result.push(doc);
							}
						});
						const categoryHolder = $('#product-placeholder');
						categoryHolder.empty();
						if (result.length > 0) {
							$('#no_category').hide();
							result.forEach(doc => {
								const category = doc.data();
								const categoryId = doc.id;
								category.id = categoryId
								categoryHolder.append(categoryView(category));
							});
						}else {
							$('#no_category').show();
						}
					}else {
						console.log('No query snapshot available');
					}
					return null;
				})
				.catch(err => console.log(err.message));
		});

		$('body').on('click', '.mdc-image-list__item', (e) => {
			const id = $(e.currentTarget).attr('id').split('-')[1];
			const name = $(e.currentTarget).attr('name');

			$('#chip-product').empty();
			categories.doc(id).collection('sub_categories').get()
				.then((snapshots) => {
					if (snapshots.size === 0) {
						return false;
					}
					snapshots.forEach(doc => {
						const elem = '<div class="mdc-chip pusong_bato" tabindex="0" category-id="'+id+'" sub-sub-id="'+doc.id+'">\
            					<div class="mdc-chip__text">'+doc.data().name+'</div>\
          					</div>';
			            const chipEl = $($.parseHTML(elem))[0];
			            chipSetEl3.appendChild(chipEl);
			            chipSet3.addChip(chipEl);
					});
					return null;
				})
				.catch((err) => console.log(err));

			const queryProducts = products.where('category.id', '==', id);
			queryProducts.get(getOptions)
				.then(querySnapshot => {
					if (!querySnapshot.empty && querySnapshot.size > 0) {
						if (snackbar.isOpen) {
							snackbar.close();
						}
						product_category_table.clear().draw();
						querySnapshot.forEach(doc => {
							if (doc.exists) {
								const product = doc.data();
								const productId = doc.id;

								product.id = productId;

								var disabled = '';
								if ((product.stock || 0) === 0 || (product.price || 0) === 0) {
									// disabled = 'disabled';
								}

								var hehehe = '';
								if (product.size !== undefined && product.size !== null && product.size.length !== null && product.size.length !== undefined && product.size.length > 0) {
									for (var i = 0; i < product.size.length; i++) {
										hehehe += '<i>' + product.size[parseInt(i)] + '</i>';
										if (i !== product.size.length - 1) {
											hehehe += " ,";
										}
									}
								}

								const button = '<button product="'+encodeURIComponent(JSON.stringify(product))+'" class="mdc-button mdc-button--unelevated info_'+productId+' show_product" isStore="true" isBack="true" '+disabled+'>ADD TO CART</button>';

								const dataset = [product.name, hehehe, setStock(product.stock || 0, (product.threshold || warning_threshold)), (product.threshold || 0), button];
								product_category_table.rows.add([dataset]).draw().nodes().to$().addClass(productId);
								if ($('.info_' + doc.id).length > 0) {
									new MDCRipple(document.querySelector('.info_' + doc.id));
								}
							}
						});
						$('#category-title').text(name);
						dialog_products.open();
					}else {
						$('#snackbar-action').attr('category-id', id);
						snackbar.open();
						if (snackbar_upload.isOpen) {
							snackbar_upload.close();
						}
					}
					return null;
				})
				.catch(err => console.log(err.message));
		});

		var curSelectedId = '';
		chipSet3.listen('MDCChip:interaction', (event) => {
	   		const chipId = event.detail.chipId;
	   		const subCategoryId = $($('#' + chipId)[0]).attr('sub-sub-id') || null;
	   		const categoryId = $($('#' + chipId)[0]).attr('category-id') || null;
	   		var queryProducts;
	   		if (curSelectedId !== subCategoryId) {
	   			curSelectedId = subCategoryId;
	   			queryProducts = products.where('sub_category_id', '==', subCategoryId);
	   		}else if (curSelectedId === subCategoryId) {
	   			curSelectedId = '';
	   			queryProducts = products.where('category.id', '==', categoryId);
	   		}

	   		queryProducts.get(getOptions)
	   			.then(querySnapshot => {
	   				product_category_table.clear().draw();
	   				if (!querySnapshot.empty && querySnapshot.size > 0) {
	   					if (snackbar.isOpen) {
	   						snackbar.close();
	   					}
	   					querySnapshot.forEach(doc => {
	   						const product = doc.data();
	   						const productId = doc.id;

	   						product.id = productId;

	   						var disabled = '';
	   						if ((product.stock || 0) === 0 || (product.price || 0) === 0) {
	   							// disabled = 'disabled';
	   						}
	   						var hehehe = '';
	   						if (product.size !== undefined && product.size !== null && product.size.length !== null && product.size.length !== undefined && product.size.length > 0) {
	   							for (var i = 0; i < product.size.length; i++) {
	   								hehehe += '<i>' + product.size[parseInt(i)] + '</i>';
	   								if (i !== product.size.length - 1) {
	   									hehehe += " ,";
	   								}
	   							}
	   						}
	   						const button = '<button product="'+encodeURIComponent(JSON.stringify(product))+'" class="mdc-button mdc-button--unelevated info_'+productId+' show_product" isStore="true" isBack="true" '+disabled+'>ADD TO CART</button>';

	   						const dataset = [product.name, hehehe, setStock(product.stock || 0, (product.threshold || warning_threshold)), (product.threshold || 0), button];
	   						product_category_table.rows.add([dataset]).draw().nodes().to$().addClass(productId);
	   						if ($('.info' + productId).length > 0) {
	   							new MDCRipple(document.querySelector('.info_' + productId));
	   						}
	   						
	   					});
	   				}
	   				return null;
	   			})
	   			.catch(err => console.log(err.message));
	  	})

		products.onSnapshot((snapshot) => {
			snapshot.docChanges().forEach((change) => {
				const product = change.doc.data();
				const productId = change.doc.id;
				product.id = productId;

				var disabled = '';
				if ((product.stock || 0) === 0 || (product.price || 0) === 0) {
					// disabled = 'disabled';
				}
				const button = '<button product="'+encodeURIComponent(JSON.stringify(product))+'" class="mdc-button mdc-button--unelevated infoo_'+productId+' show_product" isStore="true" '+disabled+'>ADD TO CART</button>';
				const input = '<center>\
					<div class="mdc-text-field input-sell-'+change.doc.id+' mdc-text-field--dense" style="width: 250px; margin-bottom: 8px; display: block;">\
					  <input type="number" stock="'+(product.stock || 0)+'" price="'+(product.price || 0)+'" id="'+change.doc.id+'" class="item_quantity mdc-text-field__input" name="input-sell-'+change.doc.id+'" required>\
					  <label class="mdc-floating-label" for="'+change.doc.id+'">Quantity</label>\
					  <div class="mdc-line-ripple"></div>\
					</div>\
				</center>';

				var hehehe = '';
				if (product.size !== undefined && product.size !== null && product.size.length !== null && product.size.length !== undefined && product.size.length > 0) {
					for (var i = 0; i < product.size.length; i++) {
						hehehe += '<i>' + product.size[parseInt(i)] + '</i>';
						if (i !== product.size.length - 1) {
							hehehe += " ,";
						}
					}
				}

				const dataset = [product.name, hehehe, product.type.name, (product.category.name || null), setStock(product.stock || 0, (product.threshold || warning_threshold)), (product.threshold || 0), input];

				if (change.type === 'added') {
					product_list_table.rows.add([dataset]).draw().nodes().to$().addClass(productId);
				}
				if (change.type === 'modified') {
					product_list_table.row('.' + productId).data(dataset).draw();
				}
				if (change.type === 'removed') {
					product_list_table.row('.' + productId).remove().draw();
				}

				if ($('.infoo_' + productId).length > 0) {
					new MDCRipple(document.querySelector('.infoo_' + productId));
				}
				if ($('.input-sell-' + change.doc.id).length > 0) {
					new MDCTextField(document.querySelector('.input-sell-' + change.doc.id));
				}
			});
		});

		$('body').on('keyup', '.input_quantity', (e) => {
			const max_quantity = parseInt($(e.currentTarget).attr('max_quantity')) || 0;
			const estimated_quantity = $(e.currentTarget).val();

			if (estimated_quantity > max_quantity) {
				// alert('CNNOT BE');
				$(e.currentTarget).val(max_quantity);
			}else if (estimated_quantity < 0) {
				// alert('CANNOT BE');
				$(e.currentTarget).val(0);
			}
		});

		$('body').on('keyup', '.item_quantity', (e) => {
			const max_quantity = parseInt($(e.currentTarget).attr('stock')) || 0;
			const estimated_quantity = $(e.currentTarget).val();

			if (estimated_quantity > max_quantity) {
				// alert('CNNOT BE');
				$(e.currentTarget).val(max_quantity);
			}else if (estimated_quantity < 0) {
				// alert('CANNOT BE');
				$(e.currentTarget).val(0);
			}

			var isHaveValue = false;
			$('.item_quantity').each((i, obj) => {
				const stock = parseInt($(obj).val() || 0);
				if (stock > 0) {
					isHaveValue = true;
					return false;
				}
			});
			if (isHaveValue) {
				setTimeout(() => {
					$('.mdc-fab').removeClass('mdc-fab--exited');
				}, 100);
			}else {
				setTimeout(() => {
					$('.mdc-fab').addClass('mdc-fab--exited');
				}, 250);
			}

		});

		$('#button-add-to-cart').click(() => {
			$('.input_quantity').each((i, obj) => {
				if ($(obj).val() > 0) {
					const product = JSON.parse(decodeURIComponent($(obj).attr('product')));
					if (Object.prototype.hasOwnProperty.call(cart, product.productId)) {
						cart[product.productId] = cart[product.productId] + parseInt($(obj).val());
					}else {
						cart[product.productId] = parseInt($(obj).val());
					}
				}
			});
		});

		$('#snackbar-action').click((e) => {
			const id = $(e.currentTarget).attr('category-id');
			resetInput('#form-product');
			select_category.selectedIndex = -1;
			select_category.value = id;
			select_type.selectedIndex = -1;
			$('#category-text').text('Category name');
			$('#product_image').attr('src', no_image);
			$('#dialog-add-product-title').text('Add Product');
			$('#chip-inventory').empty();
			chipSet4 = new MDCChipSet(chipSetEl4);
			$('#chip-sizes').empty();
			dialog_add_product.open();
		});

		$('body').on('click', '.show_product', (e) => {
			const product = JSON.parse(decodeURIComponent($(e.currentTarget).attr('product')));
			var isBack = $(e.currentTarget).attr('isBack') || null;
			var isStore = $(e.currentTarget).attr('isStore') || null;
			$('#product_image_info').attr('src', (product.image || no_image));
			$('#product_name').text(product.name);
			$('#product_description').text(product.description || 'No product description');
			$('#product_category').text(product.category.name);
			$('#product_type').text(product.type.name);
			$('#product_expiration').text(product.expiration || '(No expiration)');
			$('#product_stock').text(product.stock || 'out of stock');
			$('#add_to_cart').attr('product-id', product.id).attr('product-name', product.name);
			dialog_products.close();
			dialog_information.open();
			if (isBack !== null) {
				$('#info_back').show();
			}else {
				$('#info_back').hide();
			}
			if (isStore !== null) {
				$('#cart_container').show();
			}else {
				$('#cart_container').hide();
			}
			new MDCTextField(document.querySelector('.input_stock')).value = '0';
		});

		$('#add_to_cart').click((e) => {
			const id = $(e.currentTarget).attr('product-id');
			const name = $(e.currentTarget).attr('product-name');
			const stock = parseInt($('#input_stock').val());
			if (stock <= 0) {
				swal("The stock should not lesser than 1", {
		      		icon: "warning",
			    });
			}else if (stock > parseInt($('#product_stock').text())) {
				swal("The stock should not greater than " + $('#product_stock').text(), {
		      		icon: "warning",
			    });
			}else {
				if (Object.prototype.hasOwnProperty.call(cart, id)) {
					cart[id] = cart[id] + stock;
				}else {
					cart[id] = stock;
				}
				dialog_information.close();
				snackbar_upload.labelText = '\''+ name +'\' has been added in cart';
				snackbar.close();
				if (snackbar_upload.isOpen) {
					snackbar_upload.close();
				}
				snackbar_upload.open();
				const count = Object.keys(cart).length || 0;
				$('#cart-item-count').text(count);
				if (count > 0) {
					setTimeout(() => {
						$('#badge-elem').removeClass('mdc-fab--exited');
					}, 650);
				}
			}
			return null;
		});

		$('#cart-button').click(() => {
			swal({
				title: "Are you sure?", //eslint-disable-next-line
				text: "Are you sure to sold these product(s)?",
				icon: "warning",
				buttons: true,
				dangerMode: true,
			})
			.then((willDelete) => {
				if (willDelete) {
					$('.mdc-linear-progress').addClass('mdc-linear-progress--indeterminate');
					transactions++;
					
					var transactions_u = 0;
					/*$('.item_quantity').each((i, obj) => {
						const stock = parseInt($(obj).val() || 0);
						if (stock > 0) {
							transactions_u++;
						}
					});*/
					product_list_table
						.column(6)
						.nodes()
						.each(function(a){
					    	const stock = $(a).find(".item_quantity").val() || 0;
					    	if (stock > 0) {
					    		transactions_u++;
					    	}
						});

					var sale_products = {};
					var total_sales = 0;

					product_list_table
						.column(6)
						.nodes()
						.each(function(a){
					    	const id = $(a).find(".item_quantity").attr('id'); // kung anong product id ang mababawas
					    	const price = parseInt($(a).find(".item_quantity").attr('price'));
					    	const stock = $(a).find(".item_quantity").val() || 0;

					    	if (stock > 0) {
					    		sale_products[id] = {
					    			stock: parseInt(stock),
					    			price: price,
					    			total_sales: (price * stock)
					    		};
					    		total_sales += (price * stock);

					    		// PRODUCTS
					    		const productRef = products.doc(id);
					    		return db.runTransaction(transaction => {
					    			return transaction.get(productRef)
					    				.then(productDoc => {
					    					if (!productDoc.exists) {
					    						return 'Product does not exist';
					    					}

					    					const newStock = productDoc.data().stock - stock;
					    					transaction.update(productRef, {stock: newStock});
					    					return newStock;
					    				});
					    		})
					    			.then((newStock) => {
					    				transactions_u--;
					    				if (transactions_u === 0) {
					    					swal("Successfully item sold!", {
					    			      		icon: "success",
					    				    });
					    					for (var i = 0; i < Object.keys(cart).length; i++) {
					    						delete cart[Object.keys(cart)[i]];
					    					}
					    					$('#cart-item-count').text(0);
					    					transactions--;
					    					if (transactions === 0) {
					    						$('.mdc-linear-progress').removeClass('mdc-linear-progress--indeterminate');
					    					}
					    					$('.mdc-fab').addClass('mdc-fab--exited');
					    				}
					    				return console.log('Stock decreased to ', newStock);
					    			})
					    			.catch(err => console.log('Transaction failed', err));
					    	}

						});

					/*$('.item_quantity').each((i, obj) => {
						const id = $(obj).attr('id'); // kung anong product id ang mababawas
						const stock = parseInt($(obj).val() || 0); // kung ilan ung mababawas
						const price = parseInt($(obj).attr('price'));

						if (stock > 0) {
							sale_products[id] = {
								stock: stock,
								price: price,
								total_sales: (price * stock)
							};
							total_sales += (price * stock);

							// PRODUCTS
							const productRef = products.doc(id);
							return db.runTransaction(transaction => {
								return transaction.get(productRef)
									.then(productDoc => {
										if (!productDoc.exists) {
											return 'Product does not exist';
										}

										const newStock = productDoc.data().stock - stock;
										transaction.update(productRef, {stock: newStock});
										return newStock;
									});
							})
								.then((newStock) => {
									transactions_u--;
									if (transactions_u === 0) {
										swal("Successfully checkout the cart", {
								      		icon: "success",
									    });
										for (var i = 0; i < Object.keys(cart).length; i++) {
											delete cart[Object.keys(cart)[i]];
										}
										$('#cart-item-count').text(0);
										transactions--;
										if (transactions === 0) {
											$('.mdc-linear-progress').removeClass('mdc-linear-progress--indeterminate');
										}
									}
									return console.log('Stock decreased to ', newStock);
								})
								.catch(err => console.log('Transaction failed', err));
						}

					});*/


					const sales_order = {
						products: sale_products,
						total_sales: total_sales,
						timestamp: firebase.firestore.FieldValue.serverTimestamp(),
						uid: uid
					}

					sales_orders.add(sales_order)
						.then(() => console.log('Sales order has been created!'))
						.catch(err => console.log(err));
				}
				return null;
			})
			.catch(err => console.log(err.message));

			/*if (Object.keys(cart).length === 0) {
				snackbar_upload.labelText = 'No item in the cart.';
				if (snackbar.isOpen) {
					snackbar.close();
				}
				snackbar_upload.open();
			}else {
				dialog_cart.open();
				const promises = [];
				for(var productId in cart) {
					// get the product
					const promise = products.doc(productId).get(getOptions);
					promises.push(promise);
				}

				Promise.all(promises)
					.then(docs => {
						cart_table.clear().draw();
						docs.forEach(doc => {
							if (doc.exists) {
								const product = doc.data();
								product.id = doc.id;
								var cart_quantity = parseInt(cart[product.id]);
								if (cart_quantity > product.stock) {
									cart_quantity = product.stock;
								}
									
								const quantity = '\
									<div class="mdc-text-field input_stock_2_'+product.id+'">\
									  <input class="mdc-text-field__input item_quantity input_'+product.id+'" price="'+(product.price || 0)+'" id="'+product.id+'" value="'+cart_quantity+'" type="number">\
									  <div class="mdc-line-ripple"></div>\
									  <label for="'+product.id+'" class="mdc-floating-label">Stock</label>\
									</div>\
								';

								const action = '\
									<button product="'+encodeURIComponent(JSON.stringify(product))+'" class="mdc-icon-button material-icons show_product cart_info_'+product.id+'" id="'+product.id+'">info</button>\
									<button class="mdc-icon-button material-icons cart_delete cart_delete_'+product.id+'" id="'+product.id+'">remove_shopping_cart</button>\
								';

								const dataset = [product.name, (product.stock || 0), quantity, action];
								cart_table.rows.add([dataset]).draw().nodes().to$().addClass(product.id);

								// TODO: Init the input and buttons here
								
								
								if ($('.cart_info_' + product.id).length > 0) {
									new MDCRipple(document.querySelector('.cart_info_' + product.id)).unbounded = true;
								}
								if ($('.input_stock_2_' + product.id).length > 0) {
									new MDCTextField(document.querySelector('.input_stock_2_' + product.id));
								}
							}else {
								console.log('This product did not exist in the database');
							}
						});
						return null;
					})
					.catch(err => console.log(err.message));

			}*/
		});

		/*$('body').on('keyup', '.item_quantity', (e) => {
			const stock = parseInt($(e.currentTarget).val());
			if (stock <= 0) {
				swal("Quantity of the product is not lesser than 1", {
		      		icon: "warning",
			    });
			}
		});*/

		$('#btn-checkout').click(() => {
			swal({
			  title: "Are you sure?",
			  text: "Are you sure to sold these product(s)?",
			  icon: "warning",
			  buttons: true,
			  dangerMode: true,
			})
			.then((willDelete) => {
				if (willDelete) {
					$('.mdc-linear-progress').addClass('mdc-linear-progress--indeterminate');
					transactions++;
					
					var transactions_u = $('.item_quantity').length;

					var sale_products = {};
					var total_sales = 0;

					$('.item_quantity').each((i, obj) => {
						const id = $(obj).attr('id'); // kung anong product id ang mababawas
						const stock = parseInt($(obj).val()); // kung ilan ung mababawas
						const price = parseInt($(obj).attr('price'));

						sale_products[id] = {
							stock: stock,
							price: price,
							total_sales: (price * stock)
						};
						total_sales += (price * stock);

						// PRODUCTS
						const productRef = products.doc(id);
						return db.runTransaction(transaction => {
							return transaction.get(productRef)
								.then(productDoc => {
									if (!productDoc.exists) {
										return 'Product does not exist';
									}

									const newStock = productDoc.data().stock - stock;
									transaction.update(productRef, {stock: newStock});
									return newStock;
								});
						})
							.then((newStock) => {
								transactions_u--;
								if (transactions_u === 0) {
									swal("Successfully checkout the cart", {
							      		icon: "success",
								    });
									for (var i = 0; i < Object.keys(cart).length; i++) {
										delete cart[Object.keys(cart)[i]];
									}
									$('#cart-item-count').text(0);
									transactions--;
									if (transactions === 0) {
										$('.mdc-linear-progress').removeClass('mdc-linear-progress--indeterminate');
									}
								}
								return console.log('Stock decreased to ', newStock);
							})
							.catch(err => console.log('Transaction failed', err));

					});


					const sales_order = {
						products: sale_products,
						total_sales: total_sales,
						timestamp: firebase.firestore.FieldValue.serverTimestamp(),
						uid: uid
					}

					sales_orders.add(sales_order)
						.then(() => console.log('Sales order has been created!'))
						.catch(err => console.log(err));

				}else {
					dialog_cart.open();
				}
				return null;
			})
			.catch(err => console.log(err.message));
		});

		$('body').on('click', '.cart_delete', (e) => {
			const id = $(e.currentTarget).attr('id');
			cart_table.row('.' + id).remove().draw();
			delete cart[id];
			const count = Object.keys(cart).length || 0;
			$('#cart-item-count').text(count);
			if (count <= 0) {
				$('#badge-elem').addClass('mdc-fab--exited');
				dialog_cart.close();
			} 
		});

		$('#info_back').click(() => dialog_products.open());

	}

	$('.nav-logout').click(() => {
		dialog_logout.open();
	});

	$('#logout').click(() => {
		setTimeout(() => {
			auth.signOut();
		}, 150);
	});

	$('.nav').click((e) => {

		const content = $(e.currentTarget).text().trim().toLowerCase();
		$('.content').hide();
		$('.content').each((i, obj) => {
			if (content.startsWith(($(obj).attr('id').toLowerCase().trim()))) {
				/*if (content === 'store') {
					setTimeout(() => {
						$('.mdc-fab').removeClass('mdc-fab--exited');
					}, 100);
				}else {
					setTimeout(() => {
						$('.mdc-fab').addClass('mdc-fab--exited');
					}, 250);
				}*/
				if (content.startsWith('notification') && content.split(" ").length > 1) {
					const batch = db.batch();
					reorder_table.rows().every( function ( rowIdx, tableLoop, rowLoop ) {
						// var data = this.data();
						const className = reorder_table.row(rowIdx).node().className;
						const notificationId = className.split(" ")[1];
						if (notificationId !== null && notificationId !== undefined) {
							const notifRef = notifications.doc(notificationId);
							batch.update(notifRef, {"seen": true});
						}
					});
					outstock_table.rows().every( function ( rowIdx, tableLoop, rowLoop ) {
						// var data = this.data();
						const className = outstock_table.row(rowIdx).node().className;
						const notificationId = className.split(" ")[1];
						if (notificationId !== null && notificationId !== undefined) {
							const notifRef = notifications.doc(notificationId);
							batch.update(notifRef, {"seen": true});
						}
					});
					indemand_table.rows().every( function ( rowIdx, tableLoop, rowLoop ) {
						// var data = this.data();
						const className = indemand_table.row(rowIdx).node().className;
						const notificationId = className.split(" ")[1];
						if (notificationId !== null && notificationId !== undefined) {
							const notifRef = notifications.doc(notificationId);
							batch.update(notifRef, {"seen": true});
						}
					});
					unsellable_table.rows().every( function ( rowIdx, tableLoop, rowLoop ) {
						// var data = this.data();
						const className = unsellable_table.row(rowIdx).node().className;
						const notificationId = className.split(" ")[1];
						if (notificationId !== null && notificationId !== undefined) {
							const notifRef = notifications.doc(notificationId);
							batch.update(notifRef, {"seen": true});
						}
					});
					batch.commit();
				}
				$(obj).show();
				resetInput('#crane-shipping-form');
			}
		});

		$('.mdc-list-divider').remove();
		const that = $(e.currentTarget);
		$(that).after('<li class="shrine-select-item-divider mdc-list-divider" role="separator"></li>');
	});

	$('body').on('keyup', '#crane-phone-input', (e) => {
		/*const value = parseInt($(e.currentTarget).val().trim());
		if (isNan(value)) {
			
		}*/
	});

	Date.prototype.addDays = function(days) {
		var dat = new Date(this.valueOf())
		dat.setDate(dat.getDate() + days);
		return dat;
	}

	function getDates(stopDate, startDate) {
		var dateArray = new Array();
		var currentDate = startDate;
		while (currentDate <= stopDate) {
			dateArray.push(currentDate)
			currentDate = currentDate.addDays(1);
		}
		return dateArray;
    }

    function formatDate(today, sp) {
    	var dd = today.getDate();
    	var mm = today.getMonth(); //As January is 0.
    	var yyyy = today.getFullYear();

    	if(dd<10) dd='0'+dd;
    	if(mm<10) mm='0'+mm;
    	return (yyyy+sp+mm+sp+dd);
    }

    // DITO MALALAMAN KUNG MAY USER O WALA
	auth.onAuthStateChanged((user) => {
		if (!user) {
			// WALANG USER
			// REDIRECT SA LOGIN PAGE
			window.location.href = './';
		}else {

			uid = user.uid;
			$('.store-displayname').text(user.displayName);

			dashboard();
			users();
			inventory();
			store();
			notification();
			report();

			// PARA MALAMAN KUNG ANONG KLASENG USER ANG NAG LOGIN
			user.getIdTokenResult()
				.then(idTokenResult => {
					userType = idTokenResult.claims.userType;
					$('.store-name').text(userType);
					if (userType.toLowerCase() === "owner") {
						$('#owner-nav').show();
						$('#dashboard').show();
					}else if (userType.toLowerCase() === "tindera") {
						$('#tindera-nav').show();
						$('#store').show();
					}
					return null;
				})
				.catch(err => console.log(err));

			// PARA MAY MA SEND NA NOTIFICATION SA BAWAT BROWSER NA GINAMIT NG MGA USER
			messaging
			    .requestPermission()
			    .then(() => messaging.getToken())
			    .then(token => {
			    	return db.collection('tokens').doc(token).set({
			    		token: token,
			    		uid: uid,
			    		timestamp: firebase.firestore.FieldValue.serverTimestamp()
			    	});
			    })
			    .then(() => console.log('Done updating the cloud token.'))
			    .catch(err => console.log(err));

			// PARA MAKA TANGGAP NG NOTIFICATION
			messaging
			    .onMessage(payload => {
			        const notificationTitle = payload.notification.title;
			        const notificationOptions = {
			            body: payload.notification.body,
			            icon: payload.notification.icon,        
			        };

			        if (!("Notification" in window)) {
			            console.log("This browser does not support system notifications");
			        }else if (Notification.permission === "granted") {
			            var notification = new Notification(notificationTitle,notificationOptions);
			            notification.onclick = function(event) {
			                event.preventDefault(); // prevent the browser from focusing the Notification's tab
			                window.open(payload.notification.click_action , '_blank');
			                notification.close();
			            }
			        }

			        return console.log("Message received. ", payload);
			    });
		}
	});

	/*var dateArray = getDates(new Date('January 28, 2019 23:15:30'), new Date('November 19, 2018 23:15:30'));
	const tallyPromises = [];
	for (var i = 0; i < dateArray.length; i++) {
		const fakeDate = formatDate(dateArray[i], '-');
		console.log(fakeDate);

		tally.doc(fakeDate).get()
			.then(doc => {
				if (!doc.exists) {
					var sale_products = {};
					var total_sales = 0;

					products.get(getOptions)
						.then(querySnapshot => {
							if (querySnapshot.size > 0) {
								const max = querySnapshot.size;
								const min = 0;
								const ran_index = [];

								const max_max = (Math.floor(Math.random() * 6) + 2);
								for (var j = 0; j < max_max; j++) {
									const random = Math.floor(Math.random() * (max - 1)) + min;
									if (ran_index.includes(random) === false) {
										ran_index.push(random);
									}
								}
								
								var sale_products = {};
								var total_sales = 0;
								ran_index.forEach(index => {
									const doc = querySnapshot.docs[index];
									if (doc.exists) {
										const product = doc.data();
										const price = (product.price || 0);
										const stock = Math.floor(Math.random() * 300) + 100;
										sale_products[doc.id] = {
											stock: stock,
											price: price,
											total_sales: (price * stock)
										};
										total_sales += (price * stock);
									}
								});

								const sales_order = {
									products: sale_products,
									total_sales: total_sales,
									timestamp: firebase.firestore.FieldValue.serverTimestamp(),
									uid: uid,
									fakeDate: fakeDate
								}

								sales_orders.add(sales_order)
									.then(() => console.log('Sales order has been created!'))
									.catch(err => console.log(err));
							}
							return null;
						})
						.catch(err => console.log(err));
					return null;
				}else {
					return null;
				}
			})
			.catch(err => console.log(err));
	}*/


});