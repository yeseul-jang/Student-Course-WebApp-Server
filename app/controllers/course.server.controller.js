const mongoose = require('mongoose');
const Course = mongoose.model('Course');
const Student = require('mongoose').model('Student');
const jwt = require('jsonwebtoken');
const config = require('../../config/config');
const jwtExpirySeconds = 300;
const jwtKey =config.secretKey;

function getErrorMessage(err) {
    if (err.errors) {
        for (let errName in err.errors) {
            if (err.errors[errName].message) return err.errors[errName].
                message;
        }
    } else {
        return 'Unknown server error';
    }
};

exports.create = function (req, res) {
    const course = new Course();
    course.courseCode = req.body.courseCode;
    course.courseName = req.body.courseName;
    course.section = req.body.section;
    course.semester = req.body.semester;

    console.log(req.body)
    //
    //
    Student.findOne({ studentNumber: req.body.studentNumber }, (err, student) => {

        if (err) { return getErrorMessage(err); }
        //
        req.id = student._id;
        console.log('student._id', req.id);


    }).then(function () {
        course.creator = req.id
        console.log('req.student._id', req.id);

        course.save((err) => {
            if (err) {
                console.log('error', getErrorMessage(err))

                return res.status(400).send({
                    message: getErrorMessage(err)
                });
            } else {
                res.status(200).json(course);
            }
        });

    });
};
exports.update = function (req, res) {
    console.log('in update:', req.course)

    const course = req.course;
    course.courseCode = req.body.courseCode;
    course.courseName = req.body.courseName;
    course.section = req.body.section;
    course.semester = req.body.semester;

    course.save((err) => {
        if (err) {
            return res.status(400).send({
                message: getErrorMessage(err)
            });
        } else {
            res.status(200).json(course);
        }
    });
};
exports.list = function (req, res) {
    Course.find().sort('-created').populate('student', 'firstName lastName fullName').exec((err, courses) => {
        if (err) {
            return res.status(400).send({
                message: getErrorMessage(err)
            });
        } else {
            res.status(200).json(courses);
        }
    });
};
//
exports.courseByID = function (req, res, next, id) {
    Course.findOne({
        _id: id
	}, (err, course) => {
		if (err) {
			// Call the next middleware with an error message
			return next(err);
		} else {
			// Set the 'req.student' property
            req.course = course;
            console.log("course >>>", course);
			// Call the next middleware
			next();
		}
	});
};
//
exports.read = function (req, res) {
    console.log("READ >>>>> ");

    const token = req.cookies.token;
	console.log(token);
	// if the cookie is not set, return 'auth'
	if (!token) {
	  return res.send({ screen: 'auth' }).end();
	}
	var payload;
	try {
	  // Parse the JWT string and store the result in `payload`.
	  // Note that we are passing the key in this method as well. This method will throw an error
	  // if the token is invalid (if it has expired according to the expiry time we set on sign in),
	  // or if the signature does not match
	  payload = jwt.verify(token, jwtKey)
	} catch (e) {
	  if (e instanceof jwt.JsonWebTokenError) {
		// the JWT is unauthorized, return a 401 error
		return res.status(401).end()
	  }
	  // otherwise, return a bad request error
	  return res.status(400).end()
    }
    
    console.log("session ID >>>>> ", payload.id);
    req.course.sessionId = payload.id;
    console.log("req.course >>>>> ", req.course);

    res.status(200).json({
        course: req.course,
        sessionId: payload.id
    });
};


//The hasAuthorization() middleware uses the req.course and req.student objects
//to verify that the current user is the student of the current course
exports.hasAuthorization = function (req, res, next) {
    console.log('in hasAuthorization - student: ', req.course.creator);
    console.log('in hasAuthorization- : ', req.id);

    if (req.course.creator != req.id) {
        var message = 'student is not authorized';
        return res.json(message);
    }else {
        next();
    }
};

exports.delete = function(req, res, next) {
    Course.findByIdAndRemove(req.course.id, req.body, function (err, course) {
      if (err) return next(err);
      console.log("Success!");
      res.json(course);
    });
};

//
exports.courseByStudentID = function (req, res, next, studentId2) {
    console.log(">>>>>>> courseByStudentID ", studentId2);
    
    //find the student then its comments using Promise mechanism of Mongoose Student.
    Student.findOne({ _id: studentId2 }, (err, student) => {
        if (err) { 
            console.log('Student do not exist !!');
            return getErrorMessage(err); 
        }
    }).then(function () {
        //find the posts from this author Comment.
        Course.find({ studentList: studentId2 }, (err, courses) => {
            if (err) { 
                console.log('Course finding err !!');

                return getErrorMessage(err); 
            } else {
                console.log('>>>> courses ', courses);

                res.status(200).json(courses);
            }

        });
    });
};

//
exports.readStudentCourseList = function (req, res) {
    res.status(200).json(req.courses);
};

exports.addCourse = function (req, res) {
    message = '';

    Course.findById(req.course._id, (err, course) => {
		if (err) {
			// Call the next middleware with an error message
			return next(err);
		} else {
            // check student already add it or not
            if(course.studentList.indexOf(req.id) > -1) {
                // exist
                message = 'You already added this course!';
                res.status(200).json(message);
            }else {
                course.studentList.push(req.id);
                course.save(function(err) {
                    if(err) return res.send(err);
    
                    message = 'You successfully added this course!';
                    res.status(200).json(message);
                });
            }

                    
		}
	});
};

exports.readStudentList = function (req, res) {
    res.status(200).json(req.students);
};

exports.studentByCourseId = function (req, res, next, courseId2) {
    console.log(">>>>>>> studentByCourseId ", courseId2);

    Course.findOne({ _id: courseId2 }).populate('studentList').exec((err, students) => {
        if (err) { 
            console.log('Student do not exist !!');
            return getErrorMessage(err); 
        } else {
            console.log("Populated students " + students.studentList);
			res.status(200).json(students.studentList);
		}
    })
};