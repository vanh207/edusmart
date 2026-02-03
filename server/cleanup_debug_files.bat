@echo off
echo ========================================
echo   Cleaning Up Debug/Test Files
echo ========================================
echo.

REM Test files
echo Deleting test files...
del /F /Q test_api.js 2>nul
del /F /Q test_teacher_students_endpoint.js 2>nul
del /F /Q test_endpoint_query.js 2>nul
del /F /Q test_school_matching.js 2>nul
del /F /Q test-connection.js 2>nul
del /F /Q test_proctoring_api.js 2>nul

REM Check files
echo Deleting check files...
del /F /Q check_schema_vocab.js 2>nul
del /F /Q check_schema.js 2>nul
del /F /Q check_grades_system.js 2>nul
del /F /Q check_schools.js 2>nul
del /F /Q check_settings_direct.js 2>nul
del /F /Q check_users.js 2>nul
del /F /Q check_db_final.js 2>nul
del /F /Q check_db.js 2>nul
del /F /Q check_data_v2.js 2>nul
del /F /Q db_check_columns.js 2>nul
del /F /Q check_classes_by_school.js 2>nul
del /F /Q quick_check_students.js 2>nul
del /F /Q check_vocab.js 2>nul
del /F /Q check_duplicate_classes.js 2>nul
del /F /Q check_data.js 2>nul
del /F /Q check_student_school_connection.js 2>nul

REM Debug files
echo Deleting debug files...
del /F /Q debug-why-no-students.js 2>nul
del /F /Q debug_auto_assign.js 2>nul
del /F /Q debug_class_6a.js 2>nul
del /F /Q debug_student_class.js 2>nul
del /F /Q debug_student_grades.js 2>nul

REM Fix files
echo Deleting fix files...
del /F /Q fix-duplicate-classes.js 2>nul
del /F /Q fix_user_update.js 2>nul
del /F /Q fix_student_school_id.js 2>nul
del /F /Q fix_socket_monitoring.js 2>nul
del /F /Q fix_minh_class.js 2>nul
del /F /Q fix_db.js 2>nul
del /F /Q fix_class_6a_school.js 2>nul
del /F /Q verify_class_fix.js 2>nul
del /F /Q verify_fix.js 2>nul
del /F /Q fix_class_6a.js 2>nul

REM Verify/Diagnose files
echo Deleting verify/diagnose files...
del /F /Q verify_students.js 2>nul
del /F /Q diagnose_rest.js 2>nul
del /F /Q find_register_endpoint.js 2>nul
del /F /Q list_models_v2.js 2>nul

REM Other temporary files
echo Deleting other temporary files...
del /F /Q scanner.js 2>nul

echo.
echo ========================================
echo   Cleanup Complete!
echo ========================================
echo.
echo All debug/test files have been removed.
pause
