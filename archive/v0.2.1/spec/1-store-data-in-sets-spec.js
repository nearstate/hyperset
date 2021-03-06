var utils = require("./utils/utils"),
	buster = require("buster"),
	hypermedia = require("../lib/hyperset")
	;

buster.spec.expose();

describe("Given config and repo", function() {

	beforeAll(function() {
		this.start = new Date();
	});
	afterAll(function() {
		console.log(new Date() - this.start);
	});

	before(function() {
		require("./utils/test-repo").flush();
		utils.GivenRepoAndConfig.call(this, "simple");
	});

	describe("When I follow a link to a non-existant set", function() {
		var context = this;
		before(function() {
			this.sets.links[0].follow(function(err, set) {
				set.findLink("non-existant").follow(function(err, result) {
					context.result = result;
				});
			});
		});

		it("it should return a 404 NOT FOUND status", function() {
			expect(this.result.status).toEqual(404);
		});

		it("it should return NRR", function() {
			expect(this.result.repr).toBe(hypermedia.NRR);
		});
	});

	describe("When I follow the root link to the first set", function() {

		before(function(done) {
			var context = this;
			this.sets.links[0].follow(function(err, set) {
				context.firstSetResult = set;
				done();
			});
		});

		it("the self link path should match the path to the set", function() {
			expect(this.firstSetResult.findLink("self").path).toBeTruthy();
			expect(this.firstSetResult.findLink("self").path).toEqual(this.sets.links[0].path);
		});

		describe("and I follow the self link", function() {

			before(function(done) {
				var context = this;
				this.firstSetResult.repr.findLink("self").follow(function(err, result) {
					context.selfResult = result;
					done();
				});
			});

			it("it should return a 200 OK result", function() {
				expect(this.selfResult.status).toEqual(200);
			});

			it("it should return the same repr", function() {
				expect(JSON.stringify(this.selfResult.repr)).toMatch(JSON.stringify(this.firstSetResult.repr));
			});

		});

		describe("and I follow the create link", function() {

			before(function(done) {
				var context = this;
				this.createThing = { "hello" : "world" };
				this.firstSetResult.repr.findLink("create").follow(this.createThing, function(err, result) {
					context.createResult = result;
					done();
				});
			});

			it("it should return a 201 CREATED result", function() {
				expect(this.createResult.status).toEqual(201);
			});

			it("it should return a repr of the added resource", function() {
				var actual = this.createResult.repr.data;
				var expected = this.createThing;
				expect(actual).toMatch(expected);
			});

			it("the resource's self link's path should be setId/itemId", function() {
				expect(this.createResult.findLink("self").path).toEqual(this.createResult.repr.name);
			});

			describe("and when I follow the set link's self link", function() {

				before(function(done) {
					var context = this;
					this.createResult.repr.findLink("set").follow(function(err, result) {
						result.findLink("self").follow(function(err, result) {
							context.setResult = result;
							done();
						});
					});
				});

				it("it should return a 200 OK result", function() {
					expect(this.setResult.status).toEqual(200);
				});

				it("it should return a repr of the set with a link to the added resource", function() {
					var context = this;
					this.setResult.repr.findLinks("item")[0].follow(function(err, result) {
						expect(result.repr.data).toMatch(context.createThing);
					});
				});

			});

			describe("and when I follow the self link", function() {

				before(function(done) {
					var context = this;
					this.createResult.repr.findLink("self").follow(function(err, result) {
						context.selfResult = result;
						done();
					});
				});

				it("it should return a 200 OK result", function() {
					expect(this.selfResult.status).toEqual(200);
				});

				it("it should return the same repr", function() {
					expect(JSON.stringify(this.selfResult.repr)).toMatch(JSON.stringify(this.createResult.repr));
				});

			});

			describe("and I follow the update link", function() {

				before(function(done) {
					var context = this;
					this.updatedRepr = { "goodbye" : "winter" };
					this.createResult.repr.findLink("update").follow(this.updatedRepr, function(err, result) {
						context.updateResult = result;
						done();
					});
				});

				it("it should return a 200 OK result", function() {
					expect(this.updateResult.status).toEqual(200);
				});

				it("it should return a repr of the updated resource", function() {
					var actual = utils.toJSON(this.updateResult.repr.data);
					expect(actual).toMatch(this.updatedRepr);
				});

				describe("and when I follow the self link", function() {

					before(function(done) {
						var context = this;
						this.updateResult.repr.findLink("self").follow(function(err, result) {
							context.selfResult = result;
							done();
						});
					});

					it("it should return a 200 OK result", function() {
						expect(this.selfResult.status).toEqual(200);
					});

					it("it should return the same repr", function() {
						expect(this.selfResult.repr.data).toMatch(this.updatedRepr);
					});

				});

			});

			describe("and I follow the delete link", function() {

				before(function(done) {
					var context = this;
					this.createResult.repr.findLink("delete").follow(function(err, result) {
						context.deleteResult = result;
						done();
					});
				});

				it("it should return a 200 OK result", function() {
					expect(this.deleteResult.status).toEqual(200);
				});

				it("it should return a repr of the deleted resource", function() {
					var expected = utils.toJSON(this.createResult.repr);
					var actual = this.deleteResult.repr;
					expect(JSON.stringify(this.createResult.repr)).toMatch(JSON.stringify(this.deleteResult.repr));
				});

				describe("and I follow the self link on the previous repr of the deleted resource", function() {

					before(function(done) {
						var context = this;
						this.createResult.repr.findLink("self").follow(function(err, result) {
							context.selfResult = result;
							done();
						});
					});
			
					it("it should return a 404 NOTFOUND result", function() {
						expect(this.selfResult.status).toEqual(404);
					});

				});

			});

		});

	});

});