import { Teacher, User, UsersRols } from '../shared/schemas.js';
import { UserModel } from './user-model.js';

export class TeacherModel {
  static async createTeacher({ id_docente, profesion, carrera, usuario }) {
    const t = await User.sequelize.transaction();
    try {
      // Verificar si el correo ya está registrado
      const existingUser = await User.findOne({
        where: { correo: usuario.correo },
        transaction: t,
      });

      if (existingUser) {
        throw new Error('EMAIL_ALREADY_REGISTERED');
      }

      // Verificar si el docente ya existe
      const existingTeacher = await Teacher.findOne({
        where: { idDocente: id_docente },
        transaction: t,
      });

      if (existingTeacher) {
        throw new Error('TEACHER_ALREADY_REGISTERED');
      }
      console.log();
      
      // Crear usuario
      const user = await User.create(
        {
          nombre: usuario.nombre,
          correo: usuario.correo,
          contraseña: usuario.contraseña,
          idRol: 2,
        },
        { transaction: t }
      );
      console.log('Usuario creado:', user?.toJSON?.());
      // Crear docente
      const disponibilidad = 'DISPONIBLE';
      const teacher = await Teacher.create(
        {
          idDocente: id_docente,
          profesion,
          disponibilidad,
          carrera,
          idUser: user.idUsers,
        },
        { transaction: t }
      );

      // Asociar rol
      await UsersRols.create(
        {
          idUsersRol: user.idUsers,
          idRols: 3,
        },
        { transaction: t }
      );

      await t.commit();
      console.log(teacher);
      
      return {
        id_usuario: user.idUsers,
        id_docente: id_docente,
        nombre: usuario.nombre,
        profesion,
        disponibilidad,
        carrera,
      };
    } catch (error) {
      await t.rollback();
      console.log(error);
      throw error;
    }
  }
}
