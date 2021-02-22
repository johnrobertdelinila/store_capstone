const functions = require('firebase-functions');
const admin = require("firebase-admin");

var serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://store-63c24.firebaseio.com",
  storageBucket: 'gs://store-63c24.appspot.com'
});

const db = admin.firestore();
const messaging = admin.messaging();
const auth = admin.auth();
const bucket = admin.storage().bucket();

const categories = db.collection('categories');
const products = db.collection('products');
const notifications = db.collection('notifications');
const tally = db.collection('tally');
const recommendations = db.collection('recommendations');

const FieldValue = admin.firestore.FieldValue;

const warning_threshold = 10;

exports.getUserRecord = functions.https.onCall((data, context) => {
	// Get the data string.
	const uid = data.uid;

	// Checking that the user is authenticated.
	if (!context.auth) {
		throw new functions.https.HttpsError('failed-precondition', 'The function must be called while authenticated');
	}

	// Check if the data is valid.
	if (!(typeof uid === 'string') || uid.length === 0) {
		throw new functions.https.HttpsError('invalid-argument', 'The function must be called with one arguments "text" containing the message text to add.');
	}

	// Getting the user information.
	return auth.getUser(uid)
		.then(userRecord => {
			console.log(userRecord.toJSON());
			return userRecord.toJSON();
		})
		.catch(error => {
			throw new functions.https.HttpsError('unknown', error.message, error);
		});

});

exports.insertNewUser = functions.https.onCall((data, context) => {
	/*if (!context.auth) {
		throw new functions.https.HttpsError('failed-precondition', 'The function must be called while authenticated');
	}*/

	data.phoneNumber = "+63" + ((data.phoneNumber).slice(1));

	return auth.createUser({
		email: data.username,
		password: data.password,
		displayName: data.name,
		phoneNumber: data.phoneNumber
	})
		.then((userRecord) => {
			// set custom user claims
			const claims = {
				storeName: data.storeName,
				userType: data.userType
			};
			return auth.setCustomUserClaims(userRecord.uid, claims);
		})
		.then(() => {
			return true;
		})
		.catch((err) => {
			throw new functions.https.HttpsError('unknown', err.message, err);
		});
});

exports.updateCategory = functions.firestore
	.document('categories/{categoryId}')
	.onUpdate((change, context) => {
		const newCategory = change.after.data();
		const previousCategory = change.before.data();

		if (newCategory.name !== previousCategory.name) {
			
			const queryProduct = products.where('category.id', '==', context.params.categoryId);
			return queryProduct.get()
				.then(snapshot => {
					if (snapshot.empty) {
						return console.log('No products found with the same category id');
					}else {
						const batch = db.batch();
						snapshot.forEach((doc) => {
							const productRef = products.doc(doc.id);
							batch.update(productRef, {'category.name': newCategory.name});
						});
						return batch.commit();
					}
				})
				.then(() => {
					console.log('All the product categories has been successfully updated');
					return;
				})
				.catch(err => console.log(err.message));

		}else {
			return console.log('The category name is not updated');
		}
	});

exports.deleteCategory = functions.firestore
	.document('categories/{categoryId}')
	.onDelete((snap, context) => {
		const category = snap.data();
		const queryProduct = products.where('category.id', '==', context.params.categoryId);
		return queryProduct.get()
			.then(snapshot => {
				if (snapshot.empty) {
					return console.log('No products found with the same category id');
				}else {
					const batch = db.batch();
					snapshot.forEach((doc) => {
						const productRef = products.doc(doc.id);
						batch.delete(productRef);
					});
					return batch.commit();
				}
			})
			.then(() => {
				console.log('All products with category ' + category.name + ' has been deleted.');
				const collectionRef = categories.doc(context.params.categoryId).collection('sub_categories');
				return deleteCollection(db, collectionRef)
			})
			.catch(err => err.message);
	});

exports.updateProductSub = functions.firestore
	.document('categories/{categoryId}/sub_categories/{subCategoryId}')
	.onWrite((change, context) => {
		if (!change.after.exists) {
			// The sub category has been deleted
			const beforeSub = change.before.data() || null;
			const ref = categories.doc(beforeSub.parent);
			return db.runTransaction(transaction => {
					return transaction.get(ref)
						.then(categoryDoc => {
							if (categoryDoc.exists) {
								const category = categoryDoc.data() || null;
								var category_products = category.products || 0; // null or int
								if (category !== null && category_products !== undefined) {
									category_products = parseInt(category_products);
									if (category_products > 0) {
										category_products -= (afterSub.products || 0); // decrementing
									}
								}
								transaction.set(ref, {"products": category_products}, { merge: true });
							}
							return null;
						});
				})
					.then(() => console.log('Number of products for this category has been updated'))
					.catch(err => console.log('Transaction failed sub category', err));
		}else if (!change.before.exists) {
			// The sub category has been added
			const afterSub = change.after.data() || null;
			const ref = categories.doc(afterSub.parent);
			return db.runTransaction(transaction => {
					return transaction.get(ref)
						.then(categoryDoc => {
							if (categoryDoc.exists) {
								const category = categoryDoc.data() || null;
								var category_products = category.products || 0; // null or int
								if (category !== null && category_products !== undefined) {
									category_products = parseInt(category_products);
									category_products += (afterSub.products || 0); // decrementing
								}
								transaction.set(ref, {"products": category_products}, { merge: true });
							}
							return null;
						});
				})
					.then(() => console.log('Number of products for this category has been updated'))
					.catch(err => console.log('Transaction failed sub category', err));
		}else if (change.before.exists) {
			// The sub category has been updated
			const beforeSub = change.before.data() || null;
			const afterSub = change.after.data() || null;
			if (beforeSub !== null && afterSub !== null) {
				const beforeProducts = beforeSub.products || null;
				const afterProducts = afterSub.products || null;
				if (beforeSub.products !== null && afterProducts !== null) {
					if (beforeProducts !== afterProducts) {
						var difference = 0;
						var operation = null;
						if (beforeProducts > afterProducts) {
							// The products of sub category has decreased
							difference = beforeProducts - afterProducts;
							operation = "decrement";
						}else {
							// Increase
							difference = afterProducts - beforeProducts;
							operation = "increment";
						}
						const ref = categories.doc(afterSub.parent);
						return db.runTransaction(transaction => {
								return transaction.get(ref)
									.then(categoryDoc => {
										if (categoryDoc.exists) {
											const category = categoryDoc.data() || null;
											var category_products = category.products || 0; // null or int
											console.log('old: ' + category_products);
											console.log('difference: ' + difference);
											if (category !== null && category_products !== undefined) {
												category_products = parseInt(category_products);
												if (operation === "increment") {
													category_products += difference; // incrementing
												}else {
													if (category_products > 0) {
														category_products -= difference; // decrementing
													}
												}
											}
											console.log('difference: ' + difference);
											console.log('new: ' + category_products);
											transaction.set(ref, {"products": category_products}, { merge: true });
										}
										return null;
									});
							})
								.then(() => console.log('Number of products for this category has been updated'))
								.catch(err => console.log('Transaction failed sub category', err));
					}else {
						console.log('Sub category has been updated but not the products');
						return null;
					}
				}else {
					console.log('Invalid sub category products');
					if (afterProducts === null) {
						console.log('After products is null');
					}
					if (beforeProducts === null) {
						console.log('Before products is null');
						console.log(beforeSub);
						console.log(beforeSub.products);
					}
					return null
				}
			}else {
				console.log('Invalid sub categories');
				return null;
			}
		}else {
			console.log('Sub category has been updated but not the products');
			return null;
		}
	});

exports.setCategoryProducts = functions.firestore
	.document('products/{productId}')
	.onWrite((change, context) => {
		const afterProduct = change.after.data();
		const beforeProduct = change.before.data();
		if (!change.before.exists) {
			// Product is newly created
			// Increment the product of sub category
			const subCategoryId = afterProduct.sub_category_id || null;
			const category = afterProduct.category;
			if (subCategoryId !== null && category !== null && category.id !== null) {
				return updateSubCategory(category.id, subCategoryId, "increment");
			}else {
				return null;
			}
		}else if (!change.after.exists) {
			// Product has been deleted
			// Decrement the product of sub category
			const subCategoryId = beforeProduct.sub_category_id || null;
			const category = beforeProduct.category;
			if (subCategoryId !== null && category !== null && category.id !== null) {
				return updateSubCategory(category.id, subCategoryId, "decrement");
			}else {
				return null;
			}
		}else {
			// Product has been updated
			// Checking if the category or sub category has been updated
			if ((beforeProduct.sub_category_id !== afterProduct.sub_category_id) 
				|| (afterProduct.category.id !== beforeProduct.category.id)) {
				const promises = [];
				var promise_decrement = new Promise((resolve, reject) => resolve(null));
				var promise_increment = new Promise((resolve, reject) => resolve(null));
				if (beforeProduct.sub_category_id !== undefined && beforeProduct.sub_category_id !== null) {
					promise_decrement = updateSubCategory(beforeProduct.category.id, beforeProduct.sub_category_id, "decrement");
				}
				if (afterProduct.category.id !== undefined && afterProduct.category.id !== null) {
					promise_increment = updateSubCategory(afterProduct.category.id, afterProduct.sub_category_id, "increment");
				}
				promises.push(promise_decrement);
				promises.push(promise_increment);
				return Promise.all(promises);
			}else {
				console.log('Product has been updated, but not the category or sub category');
				return null;
			}
		}
	});

exports.unSellableNotification = functions.firestore
	.document('products/{productId}')
	.onUpdate((change, context) => {
		const afterProduct = change.after.data();
		const beforeProduct = change.before.data();

		if (afterProduct.expiration !== undefined && afterProduct.expiration !== null 
			&& ((afterProduct.sold !== undefined && afterProduct.sold !== null 
			&& !isNaN(afterProduct.sold) && afterProduct.sold <= 0) 
			|| (afterProduct.sold === undefined || afterProduct.sold === null || afterProduct.sold === ''))) {

			// The product have expiration and
			// The sell is empty or zero

			const date = new Date();
			const current_date = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
			const today = new Date(current_date);

			const product_expiration = new Date(afterProduct.expiration);

			var isTriggerNotif = false;
			var message = '';
			const type = 'Unsellable';
			if (product_expiration <= today) {
				// This product have already been expired
				isTriggerNotif = true;
				message = 'This item went from unsellable to expired (' + afterProduct.expiration + ')';
			}else if ((product_expiration.setDate(product_expiration.getDate() - 3)) <= today) {
				// This product will expire after 3 days
				isTriggerNotif = true;
				message = 'This item was unsellable(0 sales) and will expire after 3 days on ' + afterProduct.expiration;
			}

			if (isTriggerNotif) {
				const notification = {
					timestamp: FieldValue.serverTimestamp(),
					message: message,
					productId: context.params.productId,
					seen: false,
					resolved: false,
					type: type
				};
				return notifications.add(notification)
					.then(() => sendNotification(afterProduct.name + ': ' + message, 'Store'))
					.catch(err => console.log('Notification insert failed: ', err));
			}else {
				// Expiration is not qualified
				return null;
			}

		}else {
			// Cannot send notification
			console.log('No expiration date found for this product');
			return null;
		}

	});

exports.stockNotification = functions.firestore
	.document('products/{productId}')
	.onUpdate((change, context) => {
		const afterProduct = change.after.data();
		const beforeProduct = change.before.data();

		var threshold = afterProduct.threshold || warning_threshold;

		// Only give notification when the stock is lesser or equal to the warning threshold
		if (afterProduct.stock < beforeProduct.stock && afterProduct.stock <= threshold) {
			console.log('Hey the product have stock now of :' + afterProduct.stock);

			var message = '\'' + afterProduct.name + '\' has low stock(s) with only ' + afterProduct.stock;
			var type = 'Re-stock';
			if (afterProduct.stock <= 0) {
				message = '\'' + afterProduct.name + '\' is out of stock';
				type = 'Unavailable';
			}

			const notification = {
				timestamp: FieldValue.serverTimestamp(),
				message: message,
				productId: context.params.productId,
				seen: false,
				resolved: false,
				type: type
			};
			return notifications.add(notification)
				.then(() => sendNotification('Stock Alert: ' + message, 'Store'))
				.catch(err => console.log('Notification insert failed: ', err));
		}else if (afterProduct.stock > beforeProduct.stock && afterProduct.stock > threshold) {
			console.log('The stock of the product has been increased above the threshold');
			console.log('Make it to resolved');

			return notifications.where('productId', '==', context.params.productId).get()
				.then(querySnapshot => {
					const batch = db.batch();
					querySnapshot.forEach(doc => {
						batch.update(doc.ref, {resolved: true, dateResolved: FieldValue.serverTimestamp()});
					});
					return batch.commit();
				})
				.then(() => console.log('Notifications has been resolved.'))
				.catch(err => console.log(err));
		}else {
			console.log('The stock did not decrease or not the level of warning threshold');
			return null;
		}
	});

exports.updateTally = functions.firestore
	.document('sales_orders/{sales_orderId}')
	.onCreate((snap, context) => {
		const sales_order = snap.data();
		const salesProducts = sales_order.products;

		for (var productId in salesProducts) {
			setSales(productId, salesProducts);
		}
		return null;
	});

exports.setRecommendation = functions.firestore
	.document('tokens/{tokenId}')
	.onWrite((change, context) => {

		const today = curday('-');
		return recommendations.doc(today).get()
			.then(doc => {
				if (!doc.exists || doc.data().yesterday === undefined) {
					// Send notification about the best selling product yesterday

					var yesterday = new Date();
					yesterday.setDate(yesterday.getDate() - 1);
					var dd = yesterday.getDate();
					var mm = yesterday.getMonth()+1; //As January is 0.
					var yyyy = yesterday.getFullYear();
					if(dd<10) dd='0'+dd;
					if(mm<10) mm='0'+mm;
					const yest_str = yyyy+'-'+mm+'-'+dd;

					return tally.doc(yest_str).get()
						.then(doc => {
							if (doc.exists) {
								if (doc.data().bestSeller !== undefined && doc.data().bestSeller !== null) {
									return products.doc(doc.data().bestSeller).get()
										.then(doc => {
											if (doc.exists) {
												const product = doc.data();
												const notification = {
													timestamp: FieldValue.serverTimestamp(),
													message: 'Yesterday your sale of this product was the highest. Keep that sale going.',
													productId: doc.id,
													seen: false,
													resolved: false,
													type: 'Recommendation'
												};
												return notifications.add(notification)
													.then(() => recommendations.doc(today).set({yesterday: true}, { merge: true }))
													.catch(err => console.log('Notification insert failed: ', err));
												}else {
													return console.log('Product does not exits');
												}
										})
										.catch(err => console.log(err));
								}
								console.log('Walang bestSeller');
								return null;
							}else {
								return console.log('Sorry no tally yesterday');
							}
						})
						.catch(err => console.log(err));
				}else {
					return console.log('You already send a notification recommendation');
				}
			})
			.catch(err => console.log(err));

	});

// run everyday
function dailySales() {
	return tally.get()
		.then((snapshot) => {
			if (snapshot.empty) {
				return null;
			}
			const batch = db.batch();
			snapshot.forEach(doc => {
				const tally = doc.data();
				const obj = tally.sales || null;
				if (obj !== null) {
					const productIdHigh = Object.keys(obj).reduce(function(a, b){ return obj[a] > obj[b] ? a : b }); // Highest product sales for the day
					const productIdLow = Object.keys(obj).reduce(function(a, b){ return obj[a] < obj[b] ? a : b }); // Lowest product sales for the day
					batch.set(doc.ref, {bestSeller: productIdHigh}, { merge: true });
					batch.set(doc.ref, {lowestSeller: productIdLow}, { merge: true });
					var total_sales = 0;
					for (var productId in obj) {
						total_sales += parseInt(obj[productId]);
					}
					batch.set(doc.ref, {total_sales: total_sales}, { merge: true }); // Total sales for the day
				}		
			});
			return batch.commit();
		})
		.then(() => console.log('Best selling product has been selected.'))
		.catch(err => console.log(err));
}

function setSales(productId, salesProducts) {
	const stock = salesProducts[productId].stock;

	var curdate = curday('-');
	/*if (sales_order.fakeDate !== null && sales_order.fakeDate !== undefined) {
		curdate = sales_order.fakeDate;
	}*/

	const tallyRef = tally.doc(curdate);
	return db.runTransaction(transaction => {
		return transaction.get(tallyRef)
			.then(tallyDoc => {
				var sales = {};
				sales[productId] = parseInt(stock);

				const tally = tallyDoc.data() || null;
				if (tally !== null && tally.sales !== null && tally.sales !== undefined && tally.sales[productId] !== null
				 && tally.sales[productId] !== undefined) {
					const curSales = parseInt(tally.sales[productId]); // current sale for this day
					sales[productId] += parseInt(curSales);
				}

				transaction.set(tallyRef, {"sales": sales}, { merge: true });
				return null;
			});
	})
		.then(() => {
			console.log('Tally for the product in this day has been updated');
			const transaction_promises = [];
			for (var productId in salesProducts) {
				const stock = salesProducts[productId].stock;
				const productRef = products.doc(productId);
				const promise = runTransactionProduct(productRef, stock);
				transaction_promises.push(promise);
			}
			return Promise.all(transaction_promises);
		})
		.then(() => {
			return dailySales();
		})
		.catch(err => console.log('Transaction failed tally', err));
}

function curday(sp){
	today = new Date();
	var dd = today.getDate();
	var mm = today.getMonth()+1; //As January is 0.
	var yyyy = today.getFullYear();

	if(dd<10) dd='0'+dd;
	if(mm<10) mm='0'+mm;
	return (yyyy+sp+mm+sp+dd);
}

function sendNotification(text, title) {
	const payload = {
	  notification: {
	    title: title,
	    body: text ? (text.length <= 100 ? text : text.substring(0, 97) + '...') : '',
	    icon: '/assets/logo.jpg',
	    click_action: `https://store-63c24.web.app`,
	  }
	};

	return db.collection('tokens').get()
		.then(snapshot => {
			if (snapshot.empty) {
				console.log('No matching tokens');
				return null;
			}

			var promises = [];
			snapshot.forEach(doc => {
				const tokenDoc = doc.data();
				const promise = messaging.sendToDevice(tokenDoc.token, payload);
				promises.push(promise);
			});
			return Promise.all(promises);
		})
		.then(results => console.log('Successfully send push notifications'))
		.catch(err => console.log('Error getting tokens: ', err));
}

function updateSubCategory(categoryId, subCategoryId, operation) {
	const subCategoryRef = categories.doc(categoryId).collection('sub_categories').doc(subCategoryId);
	return db.runTransaction(transaction => {
		return transaction.get(subCategoryRef)
			.then(subCategoryDoc => {
				if (subCategoryDoc.exists) {
					const subCategory = subCategoryDoc.data() || null;
					var subCategory_products = subCategory.products || 0; // null or int
					console.log(subCategory_products);
					if (subCategory !== null && subCategory_products !== null) {
						subCategory_products = parseInt(subCategory_products);
						if (operation === "increment") {
							subCategory_products += 1; // incrementing
						}else {
							if (subCategory_products > 0) {
								subCategory_products -= 1; // decrementing
							}
						}
					}
					transaction.set(subCategoryRef, {"products": subCategory_products}, { merge: true });
				}
				return null;
			});
	})
		.then(() => console.log('Number of products for this sub category has been updated'))
		.catch(err => console.log('Transaction failed sub category', err));
}

function runTransactionProduct(ref, items_sold) {
	return db.runTransaction(transaction => {
			return transaction.get(ref)
				.then(productDoc => {
					if (productDoc.exists) {
						const product = productDoc.data() || null;
						var sold = parseInt(product.sold) || 0; // null or int
						if (product !== null && sold !== undefined) {
							sold = parseInt(sold);
							sold += parseInt(items_sold);
						}
						transaction.set(ref, {"sold": sold}, { merge: true });
					}
					return null;
				});
		})
			.then(() => console.log('Number of sold items for this product has been updated'))
			.catch(err => console.log('Transaction failed product', err));
}

function deleteCollection(db, query) {
  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, resolve, reject);
  });
}

function deleteQueryBatch(db, query, resolve, reject) {
	query.get()
		.then((snapshot) => {
		// When there are no documents left, we are done
		if (snapshot.size === 0) {
			return 0;
		}

	  // Delete documents in a batch
	  let batch = db.batch();
	  snapshot.docs.forEach((doc) => {
	    batch.delete(doc.ref);
	  });

	  return batch.commit().then(() => {
	    return snapshot.size;
	  });
	}).then((numDeleted) => {
	  if (numDeleted === 0) {
	    resolve();
	    return;
	  }
	 console.log('Not all deleted');
	 return;
	})
	.catch(reject);
}