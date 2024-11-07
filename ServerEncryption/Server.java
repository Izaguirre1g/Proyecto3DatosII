/*Bibliotecas a utilizar */

import javax.swing.*;
import java.awt.*;
import java.io.DataInputStream;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.net.*;
import java.util.ArrayList;

//**constructor de la interfaz**//

class MarcoServidor extends JFrame implements Runnable {

    static ArrayList<Integer> listaPuertos = new ArrayList<Integer>();

    public MarcoServidor() {

        setBounds(1200, 300, 280, 350);

        JPanel milamina = new JPanel();

        milamina.setLayout(new BorderLayout());

        areatexto = new JTextArea();

        milamina.add(areatexto, BorderLayout.CENTER);

        add(milamina);

        setVisible(true);

        Thread mihilo = new Thread(this);

        mihilo.start();

    }


    //**creacion del socket y el hilo que pone en funcionamiento el servidor. */

    @Override
    public void run() {

        try {

            ServerSocket servidor = new ServerSocket(9999);

            String nick, ip, mensaje;
            int puerto;

            PaqueteEnvio paquete_recibido;

            /*ciclo en el cual el servidor recibe mensajes y los envia */

            while (true) {

                Socket misocket = servidor.accept();

                ObjectInputStream paquete_datos = new ObjectInputStream(misocket.getInputStream());

                paquete_recibido = (PaqueteEnvio) paquete_datos.readObject();

                nick = paquete_recibido.getNick();

                ip = paquete_recibido.getIp();

                mensaje = paquete_recibido.getMensaje();

                puerto = paquete_recibido.getPuerto();

                listaPuertos.add(puerto);

                System.out.println(listaPuertos);

                int x=0;

                /*En este ciclo for se toma el puerto anadido, se compara con el resto y se elimina en caso de que este repetido para evitar repeticiones de mensajes */

                for (int i=0; i<listaPuertos.size(); i++){

                    System.out.println(x);

                    if (listaPuertos.get(i)==puerto){
                        x+=1;
                    }
                    if (x>1 && listaPuertos.size()>1){
                        listaPuertos.remove(listaPuertos.get(listaPuertos.size()-1));

                        System.out.println("Puerto eliminado por repeticion");

                    }
                }

                areatexto.append("\n" + nick + ": " + mensaje + " para " + ip +" del puerto: " + puerto);

                /*Aqui se envia el mensaje recibido por el servidor a todos los puertos existentes */

                for (int i=0; i<listaPuertos.size(); i++){

                    System.out.println(listaPuertos);
                    
                    Socket enviaDestinatario = new Socket(ip,listaPuertos.get(i));

                    ObjectOutputStream paqueteReenvio = new ObjectOutputStream(enviaDestinatario.getOutputStream());

                    paqueteReenvio.writeObject(paquete_recibido);

                    paqueteReenvio.close();

                    enviaDestinatario.close();


                }

                


                misocket.close();

                
            }

        } catch (IOException | ClassNotFoundException e) {
            // TODO: handle exception
            e.printStackTrace();
        }

    }

    private JTextArea areatexto;
}

/*Clase principal que ejecuta el codigo */

public class Server {

    public static void main(String[] args) {

        MarcoServidor mimarco = new MarcoServidor();

        mimarco.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
    }
}

/* Codigo basado en el canal de youtube pildorasinformaticas video
 https://www.youtube.com/watch?v=L0Y6hawPB-E  */