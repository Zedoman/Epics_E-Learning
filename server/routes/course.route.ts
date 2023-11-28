import express from "express";
import { addAnswer, addQuestion, addReplyToReview, addReview, deleteCourse, editCourse, getAllCourses, getAllCoursesAD, getCourseByUser, getSingleCourse, uploadCourse } from "../controllers/course.controller";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
const courseRouter = express.Router();
//we use redis to fix the load issue if many people want to purchase the issue and many people who are not they also visit so too much load to keep that load in control we use redis 
courseRouter.post("/create-course", isAuthenticated, authorizeRoles("admin"), uploadCourse);
courseRouter.post("/update-course/:id", isAuthenticated, authorizeRoles("admin"), editCourse);
courseRouter.get("/get-course/:id",getSingleCourse);
courseRouter.get("/get-courses",getAllCourses);
courseRouter.post("/get-course-content/:id",isAuthenticated,getCourseByUser);
courseRouter.put("/add-question",isAuthenticated,addQuestion);
courseRouter.put("/add-answer",isAuthenticated,addAnswer);
courseRouter.put(
	'/add-review/:id',
    isAuthenticated,
	addReview
);

courseRouter.put(
	'/add-reply',
    isAuthenticated,
    authorizeRoles("admin"),
	addReplyToReview
);

courseRouter.get(
	'/add-all-courses',
    isAuthenticated,
    authorizeRoles("admin"),
	getAllCoursesAD
);

courseRouter.delete(
	'/delete-course/:id',
    isAuthenticated,
    authorizeRoles("admin"),
	deleteCourse
);

export default courseRouter;