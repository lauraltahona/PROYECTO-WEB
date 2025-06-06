import { db } from "../db.js";
import { EmailService } from "../service/emailSevice.js";
import { PlanEntrega, Entrega, Student } from '../shared/schemas.js';

export class EntregaModel{
    
    static async crearPlanEntrega(idProyecto, nro_entrega, titulo, descripcion, fecha_limite, correo) {
        try {
        const nuevoPlan = await PlanEntrega.create({
            idProyecto,
            nro_entrega,
            titulo,
            descripcion,
            fecha_limite
        });

        await EmailService.SendEMailPlanEntregaCreado(correo, titulo, descripcion);
        
        return nuevoPlan;
        } catch (error) {
        throw new Error('Error al registrar plan de entrega: ', error);
        }
    }

    static async subirEntrega(id_plan_entrega, id_usuario, ruta_documento, descripcion, correo_docente) {

        try {
            const estudiante = await Student.findOne({
                where: { idUser: id_usuario }
            });
            console.log(estudiante);
            
            if (!estudiante) {
                throw new Error("No se encontró un estudiante con ese usuario.");
            }

            const id_estudiante = estudiante.idEstudiante;

            const plan = await PlanEntrega.findByPk(id_plan_entrega);

            if (!plan) {
                throw new Error("No se encontró el plan de entrega.");
            }

            const ahora = new Date();

            const entrega = await Entrega.create({
                id_plan_entrega,
                id_estudiante,
                fecha_envio: ahora,
                ruta_documento,
                descripcion
            });
            await EmailService.SendEmailEntregaCreada(correo_docente, id_estudiante, descripcion);
            return entrega;
        } catch (error) {
           console.log("Error al registrar entrega: ", error);
           
        }
    }

    static async comentarRetroalimentación(id_entrega, retroalimentacion, ruta_retroalimentacion){
        console.log(id_entrega);
        
        try {
        const entrega = await Entrega.findByPk(id_entrega);
        
        if (!entrega) {
        throw new Error('Entrega no encontrada.');
        }

        entrega.retroalimentacion = retroalimentacion;
        entrega.ruta_retroalimentacion = ruta_retroalimentacion;

        await entrega.save();
        
        return { success: true, message: 'Retroalimentación guardada correctamente.' };
        } catch (error) {
            console.error('Error al agregar retroalimentación:', error);
            return { success: false, message: error.message };
        }
    }


    static async obtenerEntregasPorEstudiante(id_usuario) {
        const connection = await db.getConnection();
        
        try{
            const [studentResult] = await connection.query(
            `SELECT idEstudiante FROM students WHERE idUser = ?`, 
            [id_usuario]
            );
            console.log(studentResult);
            
            if (studentResult.length === 0) {
                throw new Error("No se encontró un estudiante con ese usuario.");
            }
            const id_estudiante = studentResult[0].idEstudiante;
            
            const [rows] = await connection.query(`
                SELECT 
                    pe.id_plan_entrega, 
                    pe.nro_entrega, 
                    pe.titulo, 
                    pe.descripcion, 
                    pe.fecha_limite,
                    u.correo AS correo_docente
                FROM plan_entregas pe
                JOIN projects p ON pe.idProyecto = p.idProyecto
                JOIN teachers t ON p.idDocente = t.idDocente
                JOIN users u ON t.idUser = u.idUsers
                WHERE p.idEstudiante = ?`, 
                [id_estudiante]
            );

            console.log(rows);
            
            return rows;
        } catch(error){
            await connection.rollback();
        } finally {
            connection.release();
        }
    }

    static async obtenerPlanesEntrega(id_proyecto){
        const connection = await db.getConnection();
        try {
        const [rows] = await connection.query(
            "SELECT * FROM plan_entregas WHERE idProyecto = ?",
            [id_proyecto]
        );
        return rows;
        } catch (error) {
            console.error("Error al obtener entregas por proyecto:", error);
        } finally {
            connection.release();
        }
    }

    static async obtenerEntregasPorPlan(id_plan_entrega) {
        const connection = await db.getConnection();
        try{
            const [rows] = await connection.query(`
                SELECT E.idEntrega, E.fecha_envio, E.ruta_documento, E.descripcion, E.id_estudiante, E.retroalimentacion, E.ruta_retroalimentacion
                FROM entregas E
                JOIN plan_entregas PE ON E.id_plan_entrega = PE.id_plan_entrega
                WHERE PE.id_plan_entrega = ?`, [id_plan_entrega]
            );

            return rows;
        } catch(error){
            console.log('Error al obtener consulta de entregas', error);
        } finally{
            connection.release();
        }
        
    }
    static async obtenerFechaLimite(id_usuario){
        const connection = await db.getConnection();

        const [studentResult] = await connection.query(
            `SELECT idEstudiante FROM students WHERE idUser = ?`,
            [id_usuario]
        );
        if (studentResult.length === 0) {
            throw new Error("No se encontró un estudiante con ese usuario.");
        }
        const id_estudiante = studentResult[0].idEstudiante;

        try{
            const [fechas] = await connection.query(`
                SELECT pe.fecha_limite, pe.titulo 
                FROM plan_entregas pe
                INNER JOIN projects p ON pe.idProyecto = p.idProyecto
                WHERE p.idEstudiante = ?`, [id_estudiante]
            );
            return fechas;
        } catch(error){
            console.log('Error en consulta de fecha', error);
        } finally{
            connection.release();
        }
    } 
}